package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/model"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/repository"
	"go.uber.org/zap"
)

type CategorizationService struct {
	repo      *repository.DictionaryRepository
	aiService *AIService
	logger    *zap.Logger
}

func NewCategorizationService(repo *repository.DictionaryRepository, aiService *AIService, logger *zap.Logger) *CategorizationService {
	return &CategorizationService{
		repo:      repo,
		aiService: aiService,
		logger:    logger,
	}
}

// CategorizeUserVocabularyBatch runs a high-throughput categorization step for a user.
// It executes the 3-Tier Zero-Waste pipeline:
// Tier 1: Check Global Phrase Cache (0 AI tokens, ~10ms SQL query).
// Tier 2: Micro-batch remaining uncached phrases to AIService (Groq/DeepSeek dense batching).
// Tier 3: Bulk update vocabulary rows and save newly classified phrases into Global Cache.
func (s *CategorizationService) CategorizeUserVocabularyBatch(ctx context.Context, userID uuid.UUID, limit int) (*dto.CategorizeBatchResponse, error) {
	if limit <= 0 {
		limit = 100
	}
	if limit > 200 {
		limit = 200
	}

	uncategorized, total, err := s.repo.CountCategorizationStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to count categorization stats: %w", err)
	}

	if uncategorized == 0 {
		return &dto.CategorizeBatchResponse{
			Processed:   0,
			Remaining:   0,
			Total:       total,
			Categorized: total,
			IsComplete:  true,
		}, nil
	}

	lexemes, err := s.repo.FindUncategorizedLexemes(ctx, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to find uncategorized lexemes: %w", err)
	}

	if len(lexemes) == 0 {
		return &dto.CategorizeBatchResponse{
			Processed:   0,
			Remaining:   0,
			Total:       total,
			Categorized: total,
			IsComplete:  true,
		}, nil
	}

	// -------------------------------------------------------------
	// Tier 1: Global Phrase Cache Lookup (0 tokens)
	// -------------------------------------------------------------
	phraseList := make([]string, len(lexemes))
	for i, lex := range lexemes {
		phraseList[i] = lex.Word
	}

	cachedPhrases, err := s.repo.FindGlobalPhraseCategories(ctx, phraseList)
	if err != nil {
		s.logger.Warn("Failed to query global phrase categories cache, will proceed with AI", zap.Error(err))
		cachedPhrases = make(map[string]string)
	}

	updates := make(map[int64]string, len(lexemes))
	var unresolvedItems []dto.PhraseItem
	unresolvedIndexMap := make(map[int64]string)

	for _, lex := range lexemes {
		cleanWord := strings.ToLower(strings.TrimSpace(lex.Word))
		if cat, found := cachedPhrases[cleanWord]; found && cat != "" {
			updates[lex.ID] = cat
		} else {
			unresolvedItems = append(unresolvedItems, dto.PhraseItem{
				ID:   lex.ID,
				Text: lex.Word,
			})
			unresolvedIndexMap[lex.ID] = cleanWord
		}
	}

	s.logger.Info("Categorization batch tier 1 cache results",
		zap.Int("total_batch", len(lexemes)),
		zap.Int("cache_hits", len(updates)),
		zap.Int("unresolved", len(unresolvedItems)))

	// -------------------------------------------------------------
	// Tier 2: Dense Array AI Micro-Batching for Unresolved Items
	// -------------------------------------------------------------
	newGlobalPhrases := make(map[string]string)
	if len(unresolvedItems) > 0 {
		aiResults, err := s.aiService.CategorizePhrasesBatch(ctx, unresolvedItems)
		if err != nil {
			s.logger.Warn("AI batch categorization returned error, using heuristic fallback", zap.Error(err))
			aiResults = s.aiService.CategorizePhrasesHeuristic(unresolvedItems)
		}

		for id, category := range aiResults {
			updates[id] = category
			if word, ok := unresolvedIndexMap[id]; ok && word != "" {
				newGlobalPhrases[word] = category
			}
		}

		// Save newly classified phrases to global cache so all other users get 0-token hits
		if len(newGlobalPhrases) > 0 {
			if err := s.repo.SaveGlobalPhraseCategories(ctx, newGlobalPhrases); err != nil {
				s.logger.Warn("Failed to persist newly classified phrases into global cache", zap.Error(err))
			}
		}
	}

	// -------------------------------------------------------------
	// Tier 3: Bulk PostgreSQL Update
	// -------------------------------------------------------------
	if len(updates) > 0 {
		if err := s.repo.BatchUpdateCategories(ctx, userID, updates); err != nil {
			return nil, fmt.Errorf("failed to batch update categories in database: %w", err)
		}
	}

	remaining := uncategorized - len(updates)
	if remaining < 0 {
		remaining = 0
	}

	return &dto.CategorizeBatchResponse{
		Processed:   len(updates),
		Remaining:   remaining,
		Total:       total,
		Categorized: total - remaining,
		IsComplete:  remaining == 0,
	}, nil
}

func (s *CategorizationService) GetVocabularyCategories(ctx context.Context, userID uuid.UUID) ([]model.CategoryGroup, error) {
	return s.repo.FindVocabularyCategories(ctx, userID)
}

func (s *CategorizationService) GetLexemesByCategory(ctx context.Context, userID uuid.UUID, category string, cursor int64, limit int) ([]model.Dictionary, bool, error) {
	return s.repo.FindLexemesByCategoryPaginated(ctx, userID, category, cursor, limit)
}
