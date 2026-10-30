package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
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
		Category:	req.Category,
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
		Category:	req.Category,
	}

	if cardRecognition.Category == "" {
		if cached, err := s.repo.FindGlobalPhraseCategories(ctx, []string{req.HighlightedText}); err == nil {
			if c, ok := cached[strings.ToLower(strings.TrimSpace(req.HighlightedText))]; ok && c != "" {
				cardRecognition.Category = c
				cardProduction.Category = c
			}
		}
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
		Category:		m.Category,
	}
}


