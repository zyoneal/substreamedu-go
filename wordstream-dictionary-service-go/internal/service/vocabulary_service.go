package service

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
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
	"github.com/substreamedu/wordstream-dictionary-service/internal/dto"
	"github.com/substreamedu/wordstream-dictionary-service/internal/model"
	"github.com/substreamedu/wordstream-dictionary-service/internal/repository"
	"go.uber.org/zap"
)

type VocabularyService struct {
	repo            *repository.DictionaryRepository
	learningService *LearningService
	redis           *redis.Client
	logger          *zap.Logger
}

func NewVocabularyService(repo *repository.DictionaryRepository, ls *LearningService, rdb *redis.Client, logger *zap.Logger) *VocabularyService {
	logger.Info("VocabularyService V11 (Reversed Cards Deep Fix) Initialized")
	return &VocabularyService{repo: repo, learningService: ls, redis: rdb, logger: logger}
}

func (s *VocabularyService) AddWord(ctx context.Context, userID uuid.UUID, req dto.AddWordRequestDto) (*dto.DictionaryItemDto, error) {
	// FAANG Requirement: Dual-Card SRS System
	// Card 0: Recognition (Front: Word -> Back: Meaning)
	// Card 1: Production (Front: Meaning -> Back: Word)
	
	cardRecognition := &model.Dictionary{
		UserID:        userID,
		Word:          req.HighlightedText,
		Translation:   req.Translation,
		Transcription: req.Transcription,
		Context:       req.Context,
		Source:        strings.TrimSpace(req.ResourceName),
		Status:        "new",
		EaseFactor:    2.5,
		Interval:      0,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
		Definition:    req.Definition,
		ImageUrl:      req.ImageUrl,
		CardType:      0,
	}

	cardProduction := &model.Dictionary{
		UserID:        userID,
		Word:          req.HighlightedText,
		Translation:   req.Translation,
		Transcription: req.Transcription,
		Context:       req.Context,
		Source:        strings.TrimSpace(req.ResourceName),
		Status:        "new",
		EaseFactor:    2.5,
		Interval:      0,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
		Definition:    req.Definition,
		ImageUrl:      req.ImageUrl,
		CardType:      1,
	}

	// IMPORTANT: Pre-populate Redis cache BEFORE saving to DB.
	if s.redis != nil {
		_ = s.EnsureGroupCountsCache(ctx, userID)
	}

	// Save both cards
	if err := s.repo.Save(ctx, cardRecognition); err != nil {
		return nil, err
	}
	if err := s.repo.Save(ctx, cardProduction); err != nil {
		s.logger.Error("Failed to save production card", zap.Error(err))
		// We don't fail the whole request if the second card fails, 
		// but we log it. In a perfect world, this would be a transaction.
	}

	// Metrics
	DictionaryAdditions.Inc()

	// PERF: Invalidate light lexemes cache so new word appears in subtitle highlighting
	s.invalidateLexemesLightCache(ctx, userID)

	// FAANG Optimization: Incremental Redis updates instead of global invalidation
	s.learningService.InvalidateCache(ctx, userID)

	// Increment the hash counter for this resource (one increment per word, not per card)
	if s.redis != nil {
		s.redis.HIncrBy(ctx, "groups:"+userID.String(), cardRecognition.Source, 1)
	}
	s.invalidateResourceCount(ctx, userID, cardRecognition.Source)

	return s.mapModelToDto(cardRecognition), nil
}
func (s *VocabularyService) GetAllLexemes(ctx context.Context, userID uuid.UUID) ([]dto.DictionaryItemDto, error) {
	lexemes, err := s.repo.FindAllLexemes(ctx, userID)
	if err != nil {
		return nil, err
	}
	var res []dto.DictionaryItemDto
	for _, l := range lexemes {
		res = append(res, *s.mapModelToDto(&l))
	}
	return res, nil
}

// GetAllLexemesLight returns minimal data for fast subtitle word highlighting.
// PERF: Redis-cached with 5-min TTL to avoid 21s full table scan on every page load.
func (s *VocabularyService) GetAllLexemesLight(ctx context.Context, userID uuid.UUID) ([]dto.LexemeLightDto, error) {
	cacheKey := "lexemes:light:" + userID.String()

	// Try Redis cache first
	if s.redis != nil {
		if val, err := s.redis.Get(ctx, cacheKey).Result(); err == nil {
			var cached []dto.LexemeLightDto
			if err := json.Unmarshal([]byte(val), &cached); err == nil {
				return cached, nil
			}
		}
	}

	// Cache miss → hit DB
	result, err := s.repo.FindAllLexemesLight(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Cache for 5 minutes
	if s.redis != nil {
		if data, err := json.Marshal(result); err == nil {
			s.redis.Set(ctx, cacheKey, string(data), 5*time.Minute)
		}
	}

	return result, nil
}

// invalidateLexemesLightCache clears the cached light lexemes for a user.
func (s *VocabularyService) invalidateLexemesLightCache(ctx context.Context, userID uuid.UUID) {
	if s.redis != nil {
		s.redis.Del(ctx, "lexemes:light:"+userID.String())
	}
}

func (s *VocabularyService) GetLexemesByResource(ctx context.Context, userID uuid.UUID, name string) ([]dto.DictionaryItemDto, error) {
	lexemes, err := s.repo.FindLexemesByResource(ctx, userID, name)
	if err != nil {
		return nil, err
	}
	var res []dto.DictionaryItemDto
	for _, l := range lexemes {
		res = append(res, *s.mapModelToDto(&l))
	}
	return res, nil
}

// GetLexemesByResourcePaginated returns a paginated response for frontend infinite scroll.
func (s *VocabularyService) GetLexemesByResourcePaginated(ctx context.Context, userID uuid.UUID, name string, cursor int64, limit int) (*dto.PaginatedResponse, error) {
	if limit <= 0 || limit > 100 {
		limit = 50 // Default and max limit
	}

	startDB := time.Now()
	queryCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	lexemes, hasMore, err := s.repo.FindLexemesByResourcePaginated(queryCtx, userID, name, cursor, limit)
	if err != nil {
		return nil, err
	}
	dbDuration := time.Since(startDB)

	// FAANG Optimization: Use the counts already stored in the groups hash cache
	// This avoids a 21s+ full table scan count(*) on large resources.
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
		Items:      items,
		NextCursor: nextCursor,
		HasMore:    hasMore,
		TotalCount: totalCount,
	}, nil
}

func (s *VocabularyService) DeleteWord(ctx context.Context, userID uuid.UUID, wordID int64) error {
	// Need to find the word first to know which resource it belongs to for cache invalidation
	word, err := s.repo.FindByID(ctx, wordID)
	if err == nil {
		s.invalidateResourceCount(ctx, userID, word.Source)
	}

	if err := s.repo.DeleteWord(ctx, userID, wordID); err != nil {
		return err
	}
	// Invalidate caches so deleted word disappears from session
	s.learningService.InvalidateCache(ctx, userID)
	s.invalidateLexemesLightCache(ctx, userID)

	// Incrementally update the group count in Redis
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
	// Invalidate caches since resource deletion removes multiple words
	s.learningService.InvalidateCache(ctx, userID)
	s.invalidateLexemesLightCache(ctx, userID)

	// Remove from Redis Hash
	if s.redis != nil {
		s.redis.HDel(ctx, "groups:"+userID.String(), name)
	}

	s.invalidateResourceCount(ctx, userID, name)
	return nil
}

func (s *VocabularyService) GetTotalWords(ctx context.Context, userID uuid.UUID) (int64, error) {
	return s.repo.CountTotalWords(ctx, userID)
}

// ResetAllSRSProgress resets all SRS/FSRS progress for a user's dictionary.
// Words are kept but all scheduling data is reset to factory defaults (status='new').
func (s *VocabularyService) ResetAllSRSProgress(ctx context.Context, userID uuid.UUID) (int64, error) {
	affected, err := s.repo.ResetAllSRSProgress(ctx, userID)
	if err != nil {
		return 0, err
	}

	// Invalidate all caches so the fresh state is reflected immediately
	s.learningService.InvalidateCache(ctx, userID)
	s.invalidateLexemesLightCache(ctx, userID)

	s.logger.Info("SRS progress reset for user",
		zap.String("userId", userID.String()),
		zap.Int64("cardsReset", affected))

	return affected, nil
}

// ResetAllSRSProgressGlobal resets SRS progress for ALL users in the system.
func (s *VocabularyService) ResetAllSRSProgressGlobal(ctx context.Context) (int64, error) {
	affected, err := s.repo.ResetAllSRSProgressGlobal(ctx)
	if err != nil {
		return 0, err
	}

	s.logger.Info("Global SRS progress reset", zap.Int64("cardsReset", affected))
	return affected, nil
}

func (s *VocabularyService) GetDictionaryStats(ctx context.Context, userID uuid.UUID) (*dto.DictionaryStatsDto, error) {
	now := time.Now()
	dueCutoff := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999999999, now.Location())

	stats, err := s.repo.GetDictionaryStats(ctx, userID, dueCutoff)
	if err != nil {
		return nil, err
	}

	// FAANG Optimization: Real-time streak calculation from logs
	stats.StreakDays = s.CalculateStreak(ctx, userID)

	return stats, nil
}

func (s *VocabularyService) GetTopUsersByWordCount(ctx context.Context, limit int) ([]dto.TopUserDto, error) {
	return s.repo.GetTopUsersByWordCount(ctx, limit)
}


func (s *VocabularyService) CalculateStreak(ctx context.Context, userID uuid.UUID) int {
	dates, err := s.repo.GetUserReviewDates(ctx, userID)
	if err != nil || len(dates) == 0 {
		return 0
	}

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	yesterday := today.AddDate(0, 0, -1)

	// Check if the latest review was today or yesterday
	latest := dates[0]
	latestYear, latestMonth, latestDay := latest.Date()
	todayYear, todayMonth, todayDay := today.Date()
	yesterdayYear, yesterdayMonth, yesterdayDay := yesterday.Date()

	isToday := latestYear == todayYear && latestMonth == todayMonth && latestDay == todayDay
	isYesterday := latestYear == yesterdayYear && latestMonth == yesterdayMonth && latestDay == yesterdayDay

	if !isToday && !isYesterday {
		return 0
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

	return streak
}

// GetVocabularyGroups FAANG Optimization: Redis Hash for O(1) Access
func (s *VocabularyService) GetVocabularyGroups(ctx context.Context, userID uuid.UUID) ([]model.DictionaryGroup, error) {
	if s.redis == nil {
		return s.repo.FindVocabularyGroups(ctx, userID)
	}

	// Ensure cache is populated
	if err := s.EnsureGroupCountsCache(ctx, userID); err != nil {
		// Fallback to DB if cache population fails
		s.logger.Error("Failed to ensure group counts cache", zap.Error(err))
		return s.repo.FindVocabularyGroups(ctx, userID)
	}

	// Fetch all from Hash
	cacheKey := "groups:" + userID.String()
	val, err := s.redis.HGetAll(ctx, cacheKey).Result()
	if err != nil {
		return s.repo.FindVocabularyGroups(ctx, userID)
	}

	// Map map[string]string to []model.DictionaryGroup
	var groups []model.DictionaryGroup
	for name, countStr := range val {
		count, _ := strconv.Atoi(countStr)
		groups = append(groups, model.DictionaryGroup{
			Name:  name,
			Count: count,
		})
	}

	// Sort by Count descending
	sort.Slice(groups, func(i, j int) bool {
		return groups[i].Count > groups[j].Count
	})

	return groups, nil
}

// EnsureGroupCountsCache checks if the Redis Hash exists, and populates it from DB if not.
// Uses a distributed lock (or simple EXISTS check) to avoid thundering herd,
// but for now simple EXISTS + TTL is sufficient for this scale.
func (s *VocabularyService) EnsureGroupCountsCache(ctx context.Context, userID uuid.UUID) error {
	cacheKey := "groups:" + userID.String()
	lockKey := "lock:groups:" + userID.String()

	// Check if key exists
	exists, err := s.redis.Exists(ctx, cacheKey).Result()
	if err != nil {
		return err
	}

	if exists > 0 {
		return nil // Cache hot
	}

	// FAANG Optimization: Distributed Lock to prevent Thundering Herd / Cache Stampede.
	// We use NX (Set if Not Exists) with a short TTL (10s is enough for a DB query).
	locked, err := s.redis.SetNX(ctx, lockKey, "1", 10*time.Second).Result()
	if err != nil {
		return err
	}

	if !locked {
		// Someone else is already populating the cache. 
		// For high performance, we can just wait a bit and check again, 
		// but for now, we'll just wait and then hit DB as fallback if it's still missing.
		time.Sleep(200 * time.Millisecond)
		if exists, _ := s.redis.Exists(ctx, cacheKey).Result(); exists > 0 {
			return nil
		}
	} else {
		// We hold the lock, ensure we release it after work
		defer s.redis.Del(ctx, lockKey)
	}

	// Cache miss - Load from DB
	groups, err := s.repo.FindVocabularyGroups(ctx, userID)
	if err != nil {
		return err
	}

	// Populate Redis Hash
	if len(groups) > 0 {
		pipeline := s.redis.Pipeline()
		// HSet accepts map[string]interface{}
		data := make(map[string]interface{})
		for _, g := range groups {
			data[g.Name] = g.Count
		}
		pipeline.HSet(ctx, cacheKey, data)
		pipeline.Expire(ctx, cacheKey, 24*time.Hour) // Long TTL, refreshed on updates
		_, err = pipeline.Exec(ctx)
		return err
	}

	return nil
}

func (s *VocabularyService) getCachedResourceCount(ctx context.Context, userID uuid.UUID, name string) int64 {
	if s.redis == nil {
		return 0
	}
	key := fmt.Sprintf("count:%s:%s", userID.String(), name)
	val, err := s.redis.Get(ctx, key).Int64()
	if err != nil {
		return 0
	}
	return val
}

func (s *VocabularyService) cacheResourceCount(ctx context.Context, userID uuid.UUID, name string, count int64) {
	if s.redis == nil {
		return
	}
	key := fmt.Sprintf("count:%s:%s", userID.String(), name)
	s.redis.Set(ctx, key, count, 5*time.Minute)
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
		ID:              m.ID,
		UserID:          m.UserID,
		HighlightedText: m.Word,
		TranslatedText:  m.Translation,
		Transcription:   m.Transcription,
		Context:         m.Context,
		ResourceName:    m.Source,
		Status:          m.Status,
		DifficultyScore: m.DifficultyScore,
		Definition:      m.Definition,
		ImageUrl:        m.ImageUrl,
		Stability:       m.Stability,
		Retrievability:  m.Retrievability,
		RollingRetention: m.RollingRetention,
		CardType:        m.CardType,
	}
}

func (s *VocabularyService) ExportDictionaryAsCsv(ctx context.Context, userID uuid.UUID) ([]byte, error) {
	items, err := s.repo.FindAllLexemes(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.generateCsv(items), nil
}

func (s *VocabularyService) ExportResourceAsCsv(ctx context.Context, userID uuid.UUID, resourceName string) ([]byte, error) {
	items, err := s.repo.FindLexemesByResource(ctx, userID, resourceName)
	if err != nil {
		return nil, err
	}
	return s.generateCsv(items), nil
}

func (s *VocabularyService) generateCsv(items []model.Dictionary) []byte {
	var csv strings.Builder
	// Anki-compatible headers for automatic field mapping and card type detection
	csv.WriteString("#sep:;\n")
	csv.WriteString("#model:SubstreamEDU (Reversed) V11\n")
	csv.WriteString("#columns:Front;Back;Image\n")
	
	for _, item := range items {
		// Build first column: word [transcription] - context
		firstCol := s.escapeCsv(item.Word)
		if item.Transcription != "" {
			firstCol += " [" + s.escapeCsv(item.Transcription) + "]"
		}
		if item.Context != "" {
			firstCol += " - " + s.escapeCsv(item.Context)
		}
		csv.WriteString(firstCol)
		csv.WriteString(";")

		// Format: Definition (Translation) or just Translation if definition is empty
		def := s.escapeCsv(item.Definition)
		trans := s.escapeCsv(item.Translation)

		var secondCol string
		if def != "" {
			secondCol = fmt.Sprintf("%s (%s)", def, trans)
		} else {
			secondCol = trans
		}

		csv.WriteString(secondCol)
		csv.WriteString(";")
		csv.WriteString(item.ImageUrl)
		csv.WriteString("\n")
	}
	return []byte(csv.String())
}

func (s *VocabularyService) ExportDictionaryAsAnki(ctx context.Context, userID uuid.UUID) ([]byte, error) {
	items, err := s.repo.FindAllLexemes(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.generateAnkiPackage(ctx, items, "SubstreamEDU Dictionary")
}

func (s *VocabularyService) ExportResourceAsAnki(ctx context.Context, userID uuid.UUID, resourceName string) ([]byte, error) {
	items, err := s.repo.FindLexemesByResource(ctx, userID, resourceName)
	if err != nil {
		return nil, err
	}
	return s.generateAnkiPackage(ctx, items, "SubstreamEDU - "+resourceName)
}

func (s *VocabularyService) generateAnkiPackage(ctx context.Context, items []model.Dictionary, deckName string) ([]byte, error) {
	// 1. Define Premium Model (V12) - Straight Card
	modelIDStraight := int64(1607392342)
	mStraight := genanki.NewModel(modelIDStraight, "SubstreamEDU (Straight) V12")
	mStraight.AddField(genanki.Field{Name: "Word"})
	mStraight.AddField(genanki.Field{Name: "Transcription"})
	mStraight.AddField(genanki.Field{Name: "Context"})
	mStraight.AddField(genanki.Field{Name: "Translation"})
	mStraight.AddField(genanki.Field{Name: "Image"})

	mStraight.AddTemplate(genanki.Template{
		Name: "Card 1 (Straight)",
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

	// 2. Define Premium Model (V12) - Reversed Card
	modelIDReversed := int64(1607392343)
	mReversed := genanki.NewModel(modelIDReversed, "SubstreamEDU (Reversed) V12")
	mReversed.AddField(genanki.Field{Name: "Word"})
	mReversed.AddField(genanki.Field{Name: "Transcription"})
	mReversed.AddField(genanki.Field{Name: "Context"})
	mReversed.AddField(genanki.Field{Name: "Translation"})
	mReversed.AddField(genanki.Field{Name: "Image"})

	mReversed.AddTemplate(genanki.Template{
		Name: "Card 2 (Reversed)",
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

	// 2. Define Deck
	deckID := int64(1607392320 + time.Now().UnixNano()%1000) // Slightly dynamic ID to avoid collisions
	deck := genanki.NewDeck(deckID, deckName, "Generated by SubstreamEDU Engine")

	// 3. Parallel Image + Audio Downloading
	type mediaResult struct {
		index    int
		name     string
		data     []byte
		err      error
		mediaKind string // "image" or "audio"
	}

	// Each item can produce up to 2 results (image + audio)
	results := make(chan mediaResult, len(items)*2)
	var wg sync.WaitGroup

	// Concurrency Semaphore to prevent network/socket exhaustion
	sem := make(chan struct{}, 20)

	httpClient := &http.Client{Timeout: 10 * time.Second}
	userAgent := "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"

	// downloadFile is a helper for downloading a URL and returning media data
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
		// --- Image download ---
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

		// --- Audio download (single words only) ---
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

				// Tier 1: Try dictionaryapi.dev for real human pronunciation
				audioURL := s.getHumanAudioURL(ctx, word)
				if audioURL != "" {
					audioData, audioErr = downloadFile(ctx, audioURL)
				}

				// Tier 2: Fallback to Google Translate TTS
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

				// Stable filename: "audio-<md5>.mp3"
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

	// 4. Map results back to items
	imageFiles := make(map[int]string)
	audioFiles := make(map[int]string)
	type mediaItem struct {
		name string
		data []byte
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

	// 5. Create Notes and Add to Deck
	for i, item := range items {
		noteImage := ""
		if name, ok := imageFiles[i]; ok {
			// Bulletproof Anki images: put the tag in the field itself
			noteImage = fmt.Sprintf(`<img src="%s">`, name)
		}

		// Embed [sound:file.mp3] directly into the Word field so audio plays with the word
		wordField := item.Word
		if name, ok := audioFiles[i]; ok {
			wordField = fmt.Sprintf("%s [sound:%s]", item.Word, name)
		}

		// Logic: if Definition exists, use it. If Translation also exists, append it in brackets.
		// If only Translation exists, use it as fallback.
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

		// Create a second note for the reversed card
		noteReversed := genanki.NewNote(modelIDReversed, []string{
			wordField,
			item.Transcription,
			item.Context,
			mainMeaning,
			noteImage,
		}, []string{"SubstreamEDU"})
		deck.AddNote(noteReversed)
	}

	// 6. Generate package
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
	// For CSV with semicolon separator, we ensure there are no semicolons, tabs or newlines breaking the format
	replacer := strings.NewReplacer(";", " ", "\t", " ", "\n", " ", "\r", "")
	return replacer.Replace(value)
}

// getHumanAudioURL queries dictionaryapi.dev for a real human pronunciation audio URL.
// Returns empty string if no audio is found. Mirrors the frontend useTTS.ts logic.
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

