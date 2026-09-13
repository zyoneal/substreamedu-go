package service

import (
	"bufio"
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/npcnixel/genanki-go"
	"github.com/redis/go-redis/v9"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/model"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/repository"
	"go.uber.org/zap"
)

var ErrExportLimitExceeded = errors.New("export limit exceeded: maximum allowed cards is 2,500")

type VocabularyService struct {
	repo             *repository.DictionaryRepository
	learningService  *LearningService
	redis            *redis.Client
	aiService        *AIService
	logger           *zap.Logger
	imageDownloadSem chan struct{}
}

func NewVocabularyService(repo *repository.DictionaryRepository, ls *LearningService, rdb *redis.Client, aiService *AIService, logger *zap.Logger) *VocabularyService {
	logger.Info("VocabularyService V11 (Reversed Cards Deep Fix) Initialized")
	return &VocabularyService{
		repo:             repo,
		learningService:  ls,
		redis:            rdb,
		aiService:        aiService,
		logger:           logger,
		imageDownloadSem: make(chan struct{}, 5),
	}
}

func (s *VocabularyService) AddWord(ctx context.Context, userID uuid.UUID, req dto.AddWordRequestDto) (*dto.DictionaryItemDto, error) {

	cardRecognition := &model.Dictionary{
		UserID:		userID,
		Word:		req.HighlightedText,
		Translation:	req.Translation,
		Transcription:	req.Transcription,
		Context:	req.Context,
		Source:		strings.TrimSpace(req.ResourceName),
		Status:		"new",
		EaseFactor:	2.5,
		Interval:	0,
		CreatedAt:	time.Now(),
		UpdatedAt:	time.Now(),
		Definition:	req.Definition,
		ImageUrl:	req.ImageUrl,
		CardType:	0,
	}

	cardProduction := &model.Dictionary{
		UserID:		userID,
		Word:		req.HighlightedText,
		Translation:	req.Translation,
		Transcription:	req.Transcription,
		Context:	req.Context,
		Source:		strings.TrimSpace(req.ResourceName),
		Status:		"new",
		EaseFactor:	2.5,
		Interval:	0,
		CreatedAt:	time.Now(),
		UpdatedAt:	time.Now(),
		Definition:	req.Definition,
		ImageUrl:	req.ImageUrl,
		CardType:	1,
	}

	if s.redis != nil {
		_ = s.EnsureGroupCountsCache(ctx, userID)
	}

	if err := s.repo.Save(ctx, cardRecognition); err != nil {
		return nil, err
	}
	if err := s.repo.Save(ctx, cardProduction); err != nil {
		s.logger.Error("Failed to save production card", zap.Error(err))
	}

	if req.ImageUrl != "" && strings.HasPrefix(req.ImageUrl, "http") {
		s.downloadAndStoreImageAsync(cardRecognition.ID, cardProduction.ID, req.ImageUrl)
	}

	DictionaryAdditions.Inc()

	s.updateLexemeLightCache(ctx, userID, cardRecognition)
	s.updateLexemeLightCache(ctx, userID, cardProduction)

	s.learningService.InvalidateCache(ctx, userID)

	if s.redis != nil {
		s.redis.HIncrBy(ctx, "groups:"+userID.String(), cardRecognition.Source, 1)
	}
	s.invalidateResourceCount(ctx, userID, cardRecognition.Source)
	s.InvalidateSRSStatsCache(ctx, userID)

	return s.mapModelToDto(cardRecognition), nil
}
func (s *VocabularyService) GetAllLexemesPaginated(ctx context.Context, userID uuid.UUID, cursor int64, limit int) (*dto.PaginatedResponse, error) {
	if limit <= 0 || limit > 10000 {
		limit = 50
	}

	lexemes, hasMore, err := s.repo.FindAllLexemesPaginated(ctx, userID, cursor, limit)
	if err != nil {
		return nil, err
	}

	items := make([]dto.DictionaryItemDto, 0, len(lexemes))
	for _, l := range lexemes {
		items = append(items, *s.mapModelToDto(&l))
	}

	var nextCursor *int64
	if hasMore && len(items) > 0 {
		lastID := items[len(items)-1].ID
		nextCursor = &lastID
	}

	return &dto.PaginatedResponse{
		Items:		items,
		NextCursor:	nextCursor,
		HasMore:	hasMore,
	}, nil
}

func (s *VocabularyService) GetAllLexemesLightPaginated(ctx context.Context, userID uuid.UUID, cursor int64, limit int) (*dto.PaginatedResponse, error) {
	if limit <= 0 || limit > 10000 {
		limit = 50
	}

	items, hasMore, err := s.repo.FindAllLexemesLightPaginated(ctx, userID, cursor, limit)
	if err != nil {
		return nil, err
	}

	var nextCursor *int64
	if hasMore && len(items) > 0 {
		lastID := items[len(items)-1].ID
		nextCursor = &lastID
	}

	return &dto.PaginatedResponse{
		Items:		items,
		NextCursor:	nextCursor,
		HasMore:	hasMore,
	}, nil
}

func (s *VocabularyService) GetRandomWord(ctx context.Context, userID uuid.UUID) (*dto.DictionaryItemDto, error) {
	word, err := s.repo.FindRandomWord(ctx, userID)
	if err != nil {
		return nil, err
	}
	if word == nil {
		return nil, nil
	}
	return s.mapModelToDto(word), nil
}

func (s *VocabularyService) updateLexemeLightCache(ctx context.Context, userID uuid.UUID, card *model.Dictionary) {
	if s.redis == nil || card == nil {
		return
	}
	cacheKey := "lexemes:light:hash:" + userID.String()

	if exists, _ := s.redis.Exists(ctx, cacheKey).Result(); exists > 0 {
		item := dto.LexemeLightDto{
			ID:			card.ID,
			HighlightedText:	card.Word,
			TranslatedText:		card.Translation,
			Definition:		card.Definition,
			CardType:		card.CardType,
		}
		if data, err := json.Marshal(item); err == nil {
			s.redis.HSet(ctx, cacheKey, fmt.Sprintf("%d", item.ID), string(data))
		}
	}
}

func (s *VocabularyService) deleteLexemeLightCache(ctx context.Context, userID uuid.UUID, cardID int64) {
	if s.redis != nil {
		cacheKey := "lexemes:light:hash:" + userID.String()
		s.redis.HDel(ctx, cacheKey, fmt.Sprintf("%d", cardID))
	}
}

func (s *VocabularyService) invalidateLexemesLightCache(ctx context.Context, userID uuid.UUID) {
	if s.redis != nil {
		s.redis.Del(ctx, "lexemes:light:hash:"+userID.String())
	}
}

func (s *VocabularyService) GetLexemesByResourcePaginated(ctx context.Context, userID uuid.UUID, name string, cursor int64, limit int) (*dto.PaginatedResponse, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	startDB := time.Now()
	queryCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	lexemes, hasMore, err := s.repo.FindLexemesByResourcePaginated(queryCtx, userID, name, cursor, limit)
	if err != nil {
		return nil, err
	}
	dbDuration := time.Since(startDB)

	var totalCount int64
	if s.redis != nil {
		countStr, err := s.redis.HGet(ctx, "groups:"+userID.String(), name).Result()
		if err == nil {
			totalCount, _ = strconv.ParseInt(countStr, 10, 64)
		} else {
			s.logger.Warn("Redis HGet group count miss/err", zap.String("name", name), zap.Error(err))
		}
	}

	if totalCount == 0 {
		dbCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
		count, err := s.repo.CountLexemesByResource(dbCtx, userID, name)
		if err != nil {
			s.logger.Error("CountLexemesByResource fallback failed", zap.String("name", name), zap.Error(err))
		} else {
			totalCount = count
		}
		cancel()
	}

	startMap := time.Now()
	items := make([]dto.DictionaryItemDto, 0, len(lexemes))
	for _, l := range lexemes {
		items = append(items, *s.mapModelToDto(&l))
	}
	mapDuration := time.Since(startMap)

	s.logger.Info("GetLexemesByResourcePaginated timings",
		zap.String("resource", name),
		zap.Duration("db_query", dbDuration),
		zap.Duration("mapping", mapDuration),
		zap.Int("items_count", len(items)),
	)

	var nextCursor *int64
	if hasMore && len(items) > 0 {
		lastID := items[len(items)-1].ID
		nextCursor = &lastID
	}

	return &dto.PaginatedResponse{
		Items:		items,
		NextCursor:	nextCursor,
		HasMore:	hasMore,
		TotalCount:	totalCount,
	}, nil
}

func (s *VocabularyService) DeleteWord(ctx context.Context, userID uuid.UUID, wordID int64) error {

	word, err := s.repo.FindByID(ctx, wordID)
	if err == nil {
		s.invalidateResourceCount(ctx, userID, word.Source)
	}

	if err := s.repo.DeleteWord(ctx, userID, wordID); err != nil {
		return err
	}

	s.learningService.InvalidateCache(ctx, userID)
	s.deleteLexemeLightCache(ctx, userID, wordID)
	s.InvalidateSRSStatsCache(ctx, userID)

	if s.redis != nil {
		if err := s.EnsureGroupCountsCache(ctx, userID); err == nil {
			newCount, _ := s.redis.HIncrBy(ctx, "groups:"+userID.String(), word.Source, -1).Result()
			if newCount <= 0 {
				s.redis.HDel(ctx, "groups:"+userID.String(), word.Source)
			}
		}
	}
	return nil
}

func (s *VocabularyService) DeleteResource(ctx context.Context, userID uuid.UUID, name string) error {
	if err := s.repo.DeleteByResource(ctx, userID, name); err != nil {
		return err
	}

	s.learningService.InvalidateCache(ctx, userID)
	s.invalidateLexemesLightCache(ctx, userID)
	s.InvalidateSRSStatsCache(ctx, userID)

	if s.redis != nil {
		s.redis.HDel(ctx, "groups:"+userID.String(), name)
	}

	s.invalidateResourceCount(ctx, userID, name)
	return nil
}

func (s *VocabularyService) GetTotalWords(ctx context.Context, userID uuid.UUID) (int64, error) {
	return s.repo.CountTotalWords(ctx, userID)
}

func (s *VocabularyService) ResetAllSRSProgress(ctx context.Context, userID uuid.UUID) (int64, error) {
	affected, err := s.repo.ResetAllSRSProgress(ctx, userID)
	if err != nil {
		return 0, err
	}

	s.learningService.InvalidateCache(ctx, userID)
	s.invalidateLexemesLightCache(ctx, userID)
	s.InvalidateSRSStatsCache(ctx, userID)

	s.logger.Info("SRS progress reset for user",
		zap.String("userId", userID.String()),
		zap.Int64("cardsReset", affected))

	return affected, nil
}

func (s *VocabularyService) ResetAllSRSProgressGlobal(ctx context.Context) (int64, error) {
	affected, err := s.repo.ResetAllSRSProgressGlobal(ctx)
	if err != nil {
		return 0, err
	}

	if s.redis != nil {
		iter := s.redis.Scan(ctx, 0, "srs:stats:*", 0).Iterator()
		for iter.Next(ctx) {
			s.redis.Del(ctx, iter.Val())
		}
	}

	s.logger.Info("Global SRS progress reset", zap.Int64("cardsReset", affected))
	return affected, nil
}

func (s *VocabularyService) GetDictionaryStats(ctx context.Context, userID uuid.UUID, loc *time.Location) (*dto.DictionaryStatsDto, error) {
	if loc == nil {
		loc = time.UTC
	}
	cacheKey := fmt.Sprintf("srs:stats:%s:%s", userID.String(), loc.String())
	if s.redis != nil {
		val, err := s.redis.Get(ctx, cacheKey).Bytes()
		if err == nil && len(val) > 0 {
			var cachedStats dto.DictionaryStatsDto
			if err := json.Unmarshal(val, &cachedStats); err == nil {
				return &cachedStats, nil
			}
		}
	}

	now := time.Now().In(loc)
	dueCutoff := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999999999, loc)

	stats, err := s.repo.GetDictionaryStats(ctx, userID, dueCutoff)
	if err != nil {
		return nil, err
	}

	streak, reviewedToday, weekDays := s.CalculateStreakInfo(ctx, userID, loc)
	stats.StreakDays = streak
	stats.ReviewedToday = reviewedToday
	stats.WeekDays = weekDays

	if s.redis != nil {
		if data, err := json.Marshal(stats); err == nil {
			s.redis.Set(ctx, cacheKey, data, 2*time.Minute)
		}
	}

	return stats, nil
}

func (s *VocabularyService) InvalidateSRSStatsCache(ctx context.Context, userID uuid.UUID) {
	if s.redis != nil {
		iter := s.redis.Scan(ctx, 0, fmt.Sprintf("srs:stats:%s*", userID.String()), 0).Iterator()
		for iter.Next(ctx) {
			s.redis.Del(ctx, iter.Val())
		}
		s.redis.Del(ctx, "srs:stats:"+userID.String())
	}
}

func (s *VocabularyService) GetTopUsersByWordCount(ctx context.Context, limit int) ([]dto.TopUserDto, error) {
	return s.repo.GetTopUsersByWordCount(ctx, limit)
}

func (s *VocabularyService) CalculateStreak(ctx context.Context, userID uuid.UUID, loc *time.Location) int {
	streak, _, _ := s.CalculateStreakInfo(ctx, userID, loc)
	return streak
}

func (s *VocabularyService) CalculateStreakInfo(ctx context.Context, userID uuid.UUID, loc *time.Location) (int, bool, []bool) {
	if loc == nil {
		loc = time.UTC
	}
	now := time.Now().In(loc)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)

	// WeekDays: 7 booleans for Monday..Sunday of the current week in loc
	weekday := int(now.Weekday()) // Sunday = 0, Monday = 1, ..., Saturday = 6
	daysSinceMonday := (weekday + 6) % 7 // Monday = 0, Tuesday = 1, ..., Sunday = 6
	mondayDate := today.AddDate(0, 0, -daysSinceMonday)
	weekDays := make([]bool, 7)

	dates, err := s.repo.GetUserReviewDates(ctx, userID, loc.String())
	if err != nil || len(dates) == 0 {
		return 0, false, weekDays
	}

	reviewedMap := make(map[string]bool, len(dates))
	for _, d := range dates {
		reviewedMap[d.Format("2006-01-02")] = true
	}

	for i := 0; i < 7; i++ {
		curDay := mondayDate.AddDate(0, 0, i)
		if reviewedMap[curDay.Format("2006-01-02")] {
			weekDays[i] = true
		}
	}

	yesterday := today.AddDate(0, 0, -1)

	latest := dates[0]
	latestYear, latestMonth, latestDay := latest.Date()
	todayYear, todayMonth, todayDay := today.Date()
	yesterdayYear, yesterdayMonth, yesterdayDay := yesterday.Date()

	isToday := latestYear == todayYear && latestMonth == todayMonth && latestDay == todayDay
	isYesterday := latestYear == yesterdayYear && latestMonth == yesterdayMonth && latestDay == yesterdayDay

	if !isToday && !isYesterday {
		return 0, false, weekDays
	}

	streak := 0
	currentExpected := latest

	for _, date := range dates {
		dy, dm, dd := date.Date()
		ey, em, ed := currentExpected.Date()

		if dy == ey && dm == em && dd == ed {
			streak++
			currentExpected = currentExpected.AddDate(0, 0, -1)
		} else {
			break
		}
	}

	return streak, isToday, weekDays
}

func (s *VocabularyService) GetVocabularyGroups(ctx context.Context, userID uuid.UUID) ([]model.DictionaryGroup, error) {
	if s.redis == nil {
		return s.repo.FindVocabularyGroups(ctx, userID)
	}

	if err := s.EnsureGroupCountsCache(ctx, userID); err != nil {

		s.logger.Error("Failed to ensure group counts cache", zap.Error(err))
		return s.repo.FindVocabularyGroups(ctx, userID)
	}

	cacheKey := "groups:" + userID.String()
	val, err := s.redis.HGetAll(ctx, cacheKey).Result()
	if err != nil {
		return s.repo.FindVocabularyGroups(ctx, userID)
	}

	groups := make([]model.DictionaryGroup, 0)
	for name, countStr := range val {
		count, _ := strconv.Atoi(countStr)
		groups = append(groups, model.DictionaryGroup{
			Name:	name,
			Count:	count,
		})
	}

	sort.Slice(groups, func(i, j int) bool {
		return groups[i].Count > groups[j].Count
	})

	return groups, nil
}

func (s *VocabularyService) EnsureGroupCountsCache(ctx context.Context, userID uuid.UUID) error {
	cacheKey := "groups:" + userID.String()
	lockKey := "lock:groups:" + userID.String()

	exists, err := s.redis.Exists(ctx, cacheKey).Result()
	if err != nil {
		return err
	}

	if exists > 0 {
		return nil
	}

	locked, err := s.redis.SetNX(ctx, lockKey, "1", 10*time.Second).Result()
	if err != nil {
		return err
	}

	if !locked {

		time.Sleep(200 * time.Millisecond)
		if exists, _ := s.redis.Exists(ctx, cacheKey).Result(); exists > 0 {
			return nil
		}
	} else {

		defer s.redis.Del(ctx, lockKey)
	}

	groups, err := s.repo.FindVocabularyGroups(ctx, userID)
	if err != nil {
		return err
	}

	if len(groups) > 0 {
		pipeline := s.redis.Pipeline()

		data := make(map[string]interface{})
		for _, g := range groups {
			data[g.Name] = g.Count
		}
		pipeline.HSet(ctx, cacheKey, data)
		pipeline.Expire(ctx, cacheKey, 24*time.Hour)
		_, err = pipeline.Exec(ctx)
		return err
	}

	return nil
}

func (s *VocabularyService) invalidateResourceCount(ctx context.Context, userID uuid.UUID, name string) {
	if s.redis == nil {
		return
	}
	key := fmt.Sprintf("count:%s:%s", userID.String(), name)
	s.redis.Del(ctx, key)
}

func (s *VocabularyService) mapModelToDto(m *model.Dictionary) *dto.DictionaryItemDto {
	return &dto.DictionaryItemDto{
		ID:			m.ID,
		UserID:			m.UserID,
		HighlightedText:	m.Word,
		TranslatedText:		m.Translation,
		Transcription:		m.Transcription,
		Context:		m.Context,
		ResourceName:		m.Source,
		Status:			m.Status,
		DifficultyScore:	m.DifficultyScore,
		Definition:		m.Definition,
		ImageUrl:		m.ImageUrl,
		Stability:		m.Stability,
		Retrievability:		m.Retrievability,
		RollingRetention:	m.RollingRetention,
		CardType:		m.CardType,
	}
}

func (s *VocabularyService) StreamDictionaryAsCsv(ctx context.Context, userID uuid.UUID, w io.Writer) error {
	items, err := s.repo.FindAllLexemes(ctx, userID)
	if err != nil {
		return err
	}
	return s.streamCsv(ctx, items, w)
}

func (s *VocabularyService) StreamResourceAsCsv(ctx context.Context, userID uuid.UUID, resourceName string, w io.Writer) error {
	items, err := s.repo.FindLexemesByResource(ctx, userID, resourceName)
	if err != nil {
		return err
	}
	return s.streamCsv(ctx, items, w)
}

func (s *VocabularyService) streamCsv(ctx context.Context, items []model.Dictionary, w io.Writer) error {
	bw := bufio.NewWriter(w)
	defer bw.Flush()

	if _, err := bw.WriteString("#sep:;\n#model:SubstreamEDU (Reversed) V11\n#columns:Front;Back;Image\n"); err != nil {
		return err
	}

	for _, item := range items {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		firstCol := s.escapeCsv(item.Word)
		if item.Transcription != "" {
			firstCol += " [" + s.escapeCsv(item.Transcription) + "]"
		}
		if item.Context != "" {
			firstCol += " - " + s.escapeCsv(item.Context)
		}

		def := s.escapeCsv(item.Definition)
		trans := s.escapeCsv(item.Translation)

		var secondCol string
		if def != "" {
			secondCol = fmt.Sprintf("%s (%s)", def, trans)
		} else {
			secondCol = trans
		}

		line := fmt.Sprintf("%s;%s;%s\n", firstCol, secondCol, item.ImageUrl)
		if _, err := bw.WriteString(line); err != nil {
			return err
		}
	}
	return bw.Flush()
}

func (s *VocabularyService) ExportDictionaryAsAnki(ctx context.Context, userID uuid.UUID, maxLimit int) ([]byte, error) {
	items, err := s.repo.FindAllLexemes(ctx, userID)
	if err != nil {
		return nil, err
	}
	if maxLimit > 0 && len(items) > maxLimit {
		return nil, ErrExportLimitExceeded
	}
	return s.generateAnkiPackage(ctx, items, "SubstreamEDU Dictionary")
}

func (s *VocabularyService) ExportResourceAsAnki(ctx context.Context, userID uuid.UUID, resourceName string, maxLimit int) ([]byte, error) {
	items, err := s.repo.FindLexemesByResource(ctx, userID, resourceName)
	if err != nil {
		return nil, err
	}
	if maxLimit > 0 && len(items) > maxLimit {
		return nil, ErrExportLimitExceeded
	}
	return s.generateAnkiPackage(ctx, items, "SubstreamEDU - "+resourceName)
}

func (s *VocabularyService) generateAnkiPackage(ctx context.Context, items []model.Dictionary, deckName string) ([]byte, error) {

	modelIDStraight := int64(1607392342)
	mStraight := genanki.NewModel(modelIDStraight, "SubstreamEDU (Straight) V12")
	mStraight.AddField(genanki.Field{Name: "Word"})
	mStraight.AddField(genanki.Field{Name: "Transcription"})
	mStraight.AddField(genanki.Field{Name: "Context"})
	mStraight.AddField(genanki.Field{Name: "Translation"})
	mStraight.AddField(genanki.Field{Name: "Image"})

	mStraight.AddTemplate(genanki.Template{
		Name:	"Card 1 (Straight)",
		Qfmt: `
			<div class="card">
				<div class="word">{{Word}}</div>
				{{#Transcription}}<div class="transcription">[{{Transcription}}]</div>{{/Transcription}}
				{{#Context}}<div class="context">{{Context}}</div>{{/Context}}
			</div>`,
		Afmt: `
			<div class="card">
				<div class="word">{{Word}}</div>
				{{#Transcription}}<div class="transcription">[{{Transcription}}]</div>{{/Transcription}}
				<hr>
				<div class="translation">{{Translation}}</div>
				{{#Image}}<div class="image-container">{{Image}}</div>{{/Image}}
			</div>`,
	})

	modelIDReversed := int64(1607392343)
	mReversed := genanki.NewModel(modelIDReversed, "SubstreamEDU (Reversed) V12")
	mReversed.AddField(genanki.Field{Name: "Word"})
	mReversed.AddField(genanki.Field{Name: "Transcription"})
	mReversed.AddField(genanki.Field{Name: "Context"})
	mReversed.AddField(genanki.Field{Name: "Translation"})
	mReversed.AddField(genanki.Field{Name: "Image"})

	mReversed.AddTemplate(genanki.Template{
		Name:	"Card 2 (Reversed)",
		Qfmt: `
			<div class="card">
				<div class="translation">{{Translation}}</div>
			</div>`,
		Afmt: `
			<div class="card">
				<div class="translation">{{Translation}}</div>
				<hr>
				<div class="word">{{Word}}</div>
				{{#Transcription}}<div class="transcription">[{{Transcription}}]</div>{{/Transcription}}
				{{#Context}}<div class="context">{{Context}}</div>{{/Context}}
				{{#Image}}<div class="image-container">{{Image}}</div>{{/Image}}
			</div>`,
	})

	css := `
		.card {
			font-family: arial;
			font-size: 20px;
			text-align: center;
			background-color: white !important;
			color: black !important;
			padding: 20px;
			min-height: 100vh;
		}
		.nightMode .card {
			background-color: white !important;
			color: black !important;
		}
		.word { font-size: 32px; font-weight: bold; margin-bottom: 0.5em; color: black !important; }
		.transcription { color: #666 !important; font-size: 18px; margin-bottom: 0.5em; }
		.context {
			font-style: italic;
			color: #444 !important;
			margin: 1em 0;
			padding: 0.5em;
			background: #f0f0f0 !important;
			border-radius: 4px;
			border-left: 3px solid #4CAF50;
		}
		.translation { font-size: 24px; color: #2e7d32 !important; font-weight: bold; }
		.image-container { margin-top: 1em; }
		img { max-width: 100%; height: auto; border-radius: 8px; }
	`
	mStraight.SetCSS(css)
	mReversed.SetCSS(css)

	deckID := int64(1607392320 + time.Now().UnixNano()%1000)
	deck := genanki.NewDeck(deckID, deckName, "Generated by SubstreamEDU Engine")

	type mediaResult struct {
		index		int
		name		string
		data		[]byte
		err		error
		mediaKind	string
	}

	results := make(chan mediaResult, len(items)*2)
	var wg sync.WaitGroup

	sem := make(chan struct{}, 10)

	httpClient := &http.Client{Timeout: 10 * time.Second}
	userAgent := "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"

	downloadFile := func(ctx context.Context, url string) ([]byte, error) {
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("User-Agent", userAgent)
		resp, err := httpClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
		}
		return io.ReadAll(resp.Body)
	}

	for i, item := range items {

		if item.ImageUrl == "" || !strings.HasPrefix(item.ImageUrl, "http") {
			results <- mediaResult{index: i, mediaKind: "image"}
		} else {
			wg.Add(1)
			sem <- struct{}{}
			go func(idx int, url string) {
				defer wg.Done()
				defer func() { <-sem }()

				data, err := downloadFile(ctx, url)
				if err != nil {
					results <- mediaResult{index: idx, err: err, mediaKind: "image"}
					return
				}

				hash := md5.Sum([]byte(url))
				cleanPath := url
				if qi := strings.Index(cleanPath, "?"); qi != -1 {
					cleanPath = cleanPath[:qi]
				}
				if hi := strings.Index(cleanPath, "#"); hi != -1 {
					cleanPath = cleanPath[:hi]
				}
				ext := strings.ToLower(filepath.Ext(cleanPath))
				if ext == "" || len(ext) > 5 {
					ext = ".jpg"
				}
				name := hex.EncodeToString(hash[:]) + ext
				results <- mediaResult{index: idx, name: name, data: data, mediaKind: "image"}
			}(i, item.ImageUrl)
		}

		isPhrase := len(strings.Fields(item.Word)) > 1
		if isPhrase || item.Word == "" {
			results <- mediaResult{index: i, mediaKind: "audio"}
		} else {
			wg.Add(1)
			sem <- struct{}{}
			go func(idx int, word string) {
				defer wg.Done()
				defer func() { <-sem }()

				var audioData []byte
				var audioErr error

				audioURL := s.getHumanAudioURL(ctx, word)
				if audioURL != "" {
					audioData, audioErr = downloadFile(ctx, audioURL)
				}

				if audioData == nil || audioErr != nil {
					ttsURL := fmt.Sprintf(
						"https://translate.googleapis.com/translate_tts?ie=UTF-8&q=%s&tl=en&total=1&idx=0&textlen=%d&client=gtx",
						strings.ReplaceAll(word, " ", "+"),
						len(word),
					)
					audioData, audioErr = downloadFile(ctx, ttsURL)
				}

				if audioErr != nil || audioData == nil {
					results <- mediaResult{index: idx, err: audioErr, mediaKind: "audio"}
					return
				}

				hash := md5.Sum([]byte("audio:" + word))
				name := "audio-" + hex.EncodeToString(hash[:]) + ".mp3"
				results <- mediaResult{index: idx, name: name, data: audioData, mediaKind: "audio"}
			}(i, item.Word)
		}
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	imageFiles := make(map[int]string)
	audioFiles := make(map[int]string)
	type mediaItem struct {
		name	string
		data	[]byte
	}
	var allMedia []mediaItem
	for res := range results {
		if res.err != nil {
			s.logger.Warn("Failed to download Anki media", zap.Error(res.err), zap.Int("index", res.index), zap.String("kind", res.mediaKind))
			continue
		}
		if res.name != "" {
			switch res.mediaKind {
			case "image":
				imageFiles[res.index] = res.name
			case "audio":
				audioFiles[res.index] = res.name
			}
			allMedia = append(allMedia, mediaItem{name: res.name, data: res.data})
		}
	}

	for i, item := range items {
		noteImage := ""
		if name, ok := imageFiles[i]; ok {

			noteImage = fmt.Sprintf(`<img src="%s">`, name)
		}

		wordField := item.Word
		if name, ok := audioFiles[i]; ok {
			wordField = fmt.Sprintf("%s [sound:%s]", item.Word, name)
		}

		mainMeaning := item.Translation
		if item.Definition != "" {
			if item.Translation != "" {
				mainMeaning = fmt.Sprintf("%s (%s)", item.Definition, item.Translation)
			} else {
				mainMeaning = item.Definition
			}
		}

		noteStraight := genanki.NewNote(modelIDStraight, []string{
			wordField,
			item.Transcription,
			item.Context,
			mainMeaning,
			noteImage,
		}, []string{"SubstreamEDU"})
		deck.AddNote(noteStraight)

		noteReversed := genanki.NewNote(modelIDReversed, []string{
			wordField,
			item.Transcription,
			item.Context,
			mainMeaning,
			noteImage,
		}, []string{"SubstreamEDU"})
		deck.AddNote(noteReversed)
	}

	package_ := genanki.NewPackage([]*genanki.Deck{deck})
	package_.AddModel(mStraight)
	package_.AddModel(mReversed)

	for _, m := range allMedia {
		package_.AddMedia(m.name, m.data)
	}

	tmpFile, err := os.CreateTemp("", "anki_export_*.apkg")
	if err != nil {
		return nil, fmt.Errorf("failed to create temporary file: %w", err)
	}
	tmpPath := tmpFile.Name()
	tmpFile.Close()
	defer os.Remove(tmpPath)

	if err := package_.WriteToFile(tmpPath); err != nil {
		return nil, fmt.Errorf("failed to write anki package: %w", err)
	}

	ankiData, err := os.ReadFile(tmpPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read generated anki package: %w", err)
	}

	return ankiData, nil
}

func (s *VocabularyService) escapeCsv(value string) string {
	if value == "" {
		return ""
	}

	replacer := strings.NewReplacer(";", " ", "\t", " ", "\n", " ", "\r", "")
	return replacer.Replace(value)
}

func (s *VocabularyService) getHumanAudioURL(ctx context.Context, word string) string {
	apiURL := fmt.Sprintf("https://api.dictionaryapi.dev/api/v2/entries/en/%s", strings.ToLower(word))

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return ""
	}

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			resp.Body.Close()
		}
		return ""
	}
	defer resp.Body.Close()

	var entries []struct {
		Phonetics []struct {
			Audio string `json:"audio"`
		} `json:"phonetics"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&entries); err != nil {
		return ""
	}

	for _, entry := range entries {
		for _, p := range entry.Phonetics {
			if p.Audio != "" && strings.HasPrefix(p.Audio, "http") {
				return p.Audio
			}
		}
	}
	return ""
}

func (s *VocabularyService) downloadAndStoreImageAsync(cardID int64, productionCardID int64, remoteURL string) {
	if remoteURL == "" || !strings.HasPrefix(remoteURL, "http") {
		return
	}

	go func() {
		select {
		case s.imageDownloadSem <- struct{}{}:
			defer func() { <-s.imageDownloadSem }()
		case <-time.After(5 * time.Second):
			s.logger.Warn("Image download worker pool full, skipping async image download", zap.Int64("cardID", cardID))
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		s.logger.Info("Starting background image download", zap.Int64("cardID", cardID), zap.String("url", remoteURL))

		mediaDir := os.Getenv("SHARED_MEDIA_DIR")
		if mediaDir == "" {
			mediaDir = "/var/www/shared_media"
		}

		targetDir := filepath.Join(mediaDir, "images", "words")
		if err := os.MkdirAll(targetDir, 0755); err != nil {
			s.logger.Error("Failed to create shared media directory", zap.Error(err), zap.String("dir", targetDir))
			return
		}

		ext := ".png"
		if strings.Contains(strings.ToLower(remoteURL), ".jpg") || strings.Contains(strings.ToLower(remoteURL), ".jpeg") {
			ext = ".jpg"
		} else if strings.Contains(strings.ToLower(remoteURL), ".webp") {
			ext = ".webp"
		}

		fileName := fmt.Sprintf("%d%s", cardID, ext)
		filePath := filepath.Join(targetDir, fileName)

		req, err := http.NewRequestWithContext(ctx, "GET", remoteURL, nil)
		if err != nil {
			s.logger.Error("Failed to create download request", zap.Error(err))
			return
		}

		client := &http.Client{Timeout: 15 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			s.logger.Error("Failed to download image from remote URL", zap.Error(err), zap.String("url", remoteURL))
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			s.logger.Error("Remote server returned non-OK status during image download", zap.Int("status", resp.StatusCode), zap.String("url", remoteURL))
			return
		}

		out, err := os.Create(filePath)
		if err != nil {
			s.logger.Error("Failed to create local image file", zap.Error(err), zap.String("path", filePath))
			return
		}
		defer out.Close()

		if _, err = io.Copy(out, resp.Body); err != nil {
			s.logger.Error("Failed to save downloaded image to local file", zap.Error(err))
			return
		}

		localURL := fmt.Sprintf("/videos/images/words/%s", fileName)

		if err := s.repo.UpdateImageUrl(ctx, cardID, localURL); err != nil {
			s.logger.Error("Failed to update image URL for card recognition", zap.Error(err), zap.Int64("cardID", cardID))
			return
		}
		if productionCardID > 0 {
			if err := s.repo.UpdateImageUrl(ctx, productionCardID, localURL); err != nil {
				s.logger.Error("Failed to update image URL for card production", zap.Error(err), zap.Int64("cardID", productionCardID))
			}
		}

		s.logger.Info("Successfully downloaded and cached image locally", zap.Int64("cardID", cardID), zap.String("localURL", localURL))
	}()
}

