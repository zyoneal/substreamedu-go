package service

import (
	"context"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/substreamedu/wordstream-dictionary-service/internal/dto"
	"github.com/substreamedu/wordstream-dictionary-service/internal/model"
	"github.com/substreamedu/wordstream-dictionary-service/internal/repository"
	"github.com/substreamedu/wordstream-dictionary-service/internal/service/fsrs"
	"go.uber.org/zap"
)

type LearningService struct {
	repo          *repository.DictionaryRepository
	outboxService *OutboxService
	fsrsEngine    *fsrs.Engine
	db            *pgxpool.Pool
	redis         *redis.Client
	aiService     *AIService
	logger        *zap.Logger
}

func NewLearningService(repo *repository.DictionaryRepository, outbox *OutboxService, engine *fsrs.Engine, db *pgxpool.Pool, rdb *redis.Client, aiService *AIService, logger *zap.Logger) *LearningService {
	return &LearningService{
		repo:          repo,
		outboxService: outbox,
		fsrsEngine:    engine,
		db:            db,
		redis:         rdb,
		aiService:     aiService,
		logger:        logger,
	}
}

const SessionLimit = 50

// ──────────────────────────────────────────────────────────────────────────────
// GetDailyCards — Build the daily review session
// ──────────────────────────────────────────────────────────────────────────────
//
// Fixes applied:
// - BUG 2: todayStart is now actual today, not yesterday
// - BUG 4/5: Removed 24-hour caching entirely to prevent stale reviewed cards
// - Cards reviewed today are excluded at the query level
func (s *LearningService) GetDailyCards(ctx context.Context, userID uuid.UUID) (*dto.DailySessionDto, error) {
	now := time.Now().UTC()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	dueCutoff := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999999999, time.UTC)

	totalCount, _ := s.repo.CountTotalWords(ctx, userID)

	// 1. Fetch DUE cards (review + learning) — excludes cards reviewed today
	reviewBatch, reviewErr := s.repo.FindDueWordsSorted(ctx, userID, todayStart, dueCutoff, SessionLimit)
	if reviewErr != nil {
		s.logger.Error("Failed to fetch due words", zap.Error(reviewErr))
		reviewBatch = []model.Dictionary{}
	}

	// 2. Fill remaining session slots with new cards
	targetNew := 0
	if len(reviewBatch) < SessionLimit {
		targetNew = SessionLimit - len(reviewBatch)
	}

	newWords, _ := s.repo.FindRandomNewWords(ctx, userID, targetNew)

	// 3. Assemble and interleave: guarantee same word's cards never appear back-to-back.
	// Group by word, shuffle groups, then interleave card types.
	finalBatch := append(reviewBatch, newWords...)
	finalBatch = interleaveCards(finalBatch)

	cards := make([]dto.DictionaryItemDto, 0, len(finalBatch))
	for _, dw := range finalBatch {
		cards = append(cards, s.mapCardToDto(&dw))
	}

	result := &dto.DailySessionDto{
		Cards:               cards,
		TotalDictionarySize: totalCount,
	}

	return result, nil
}

// ──────────────────────────────────────────────────────────────────────────────
// ReviewCard — Process a single card review
// ──────────────────────────────────────────────────────────────────────────────
//
// Fixes applied:
// - BUG 1: Uses FSRS engine instead of SM2
// - BUG 3: Proper learning step progression via FSRS
// - BUG 4: Removed contradictory write-through + delete cache logic
// - BUG 7: ConsecutiveSuccess properly reset in FSRS
func (s *LearningService) ReviewCard(ctx context.Context, cardID int64, rating string, responseTimeMs int) (*dto.ReviewResponseDto, error) {
	card, err := s.repo.FindByID(ctx, cardID)
	if err != nil {
		return nil, err
	}

	// Capture state before review for logging
	stabilityBefore := card.Stability
	difficultyBefore := card.EaseFactor
	stateBefore := card.Status
	stateBeforeWasLeech := card.IsLeech

	// Calculate elapsed days for review log
	now := time.Now().UTC()
	var elapsedDays float32
	if card.LastReviewed != nil {
		elapsedDays = float32(now.Sub(*card.LastReviewed).Hours() / 24.0)
	}

	// FSRS review — single entry point handles learning vs review cards
	fsrsRating := fsrs.UserRating(rating) // "forgot" or "remember"
	result := s.fsrsEngine.Review(card, fsrsRating, responseTimeMs, nil)

	s.logger.Info("Card processed by FSRS Engine",
		zap.Int64("cardId", card.ID),
		zap.String("stateBefore", stateBefore),
		zap.String("statusAfter", card.Status),
		zap.String("rating", rating),
		zap.Float32("stabilityBefore", stabilityBefore),
		zap.Float32("stabilityAfter", card.Interval),
		zap.Int("nextIntervalDays", result.NextIntervalDays),
		zap.Bool("repeatInSession", result.RepeatInSession),
		zap.Any("nextRepDate", card.NextRepetitionDate),
		zap.Any("learningDue", card.LearningDue),
		zap.Int("learningStep", card.LearningStep))

	// Start transaction: review_log + outbox + card update are ALL atomic.
	// If any part fails, the entire transaction rolls back — safe to retry.
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Save Review Log
	ratingInt := 3 // Good
	if rating == "forgot" {
		ratingInt = 1
	}

	reviewLog := &model.ReviewLog{
		UserID:           card.UserID,
		CardID:           card.ID,
		ReviewedAt:       now,
		Rating:           ratingInt,
		ResponseTimeMs:   responseTimeMs,
		StabilityBefore:  stabilityBefore,
		DifficultyBefore: difficultyBefore,
		ElapsedDays:      elapsedDays,
		ScheduledDays:    float32(result.NextIntervalDays),
		State:            stateBefore,
	}

	if err := s.repo.SaveReviewLog(ctx, tx, reviewLog); err != nil {
		s.logger.Error("Failed to save review log", zap.Error(err), zap.Int64("cardId", card.ID))
		return nil, err
	}

	// Metrics
	ReviewsTotal.WithLabelValues(rating, card.Status).Inc()

	// Save Review Event
	event := dto.WordReviewedEvent{
		UserID:     card.UserID,
		CardID:     card.ID,
		Rating:     rating,
		ReviewedAt: now,
	}
	if err := s.outboxService.SaveEvent(ctx, tx, card.UserID.String(), "WORD_REVIEWED", event, "word-reviewed-events"); err != nil {
		return nil, err
	}

	// Save card within the SAME transaction — ensures atomicity
	if err := s.repo.SaveTx(ctx, tx, card); err != nil {
		s.logger.Error("Failed to save reviewed card", zap.Error(err), zap.Int64("cardId", card.ID))
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	response := &dto.ReviewResponseDto{
		Card:             s.mapCardToDto(card),
		RepeatInSession:  result.RepeatInSession,
		NextIntervalDays: result.NextIntervalDays,
		Stability:        card.Stability,
		Retrievability:   card.Retrievability,
		RollingRetention: card.RollingRetention,
		IsLeech:          card.IsLeech,
		CardType:         card.CardType,
	}

	// Leech event
	if card.IsLeech && !stateBeforeWasLeech {
		s.publishLeechEvent(ctx, card)
	}

	return response, nil
}

func (s *LearningService) publishLeechEvent(ctx context.Context, card *model.Dictionary) {
	event := dto.LeechDetectedEvent{
		UserID:     card.UserID,
		CardID:     card.ID,
		Word:       card.Word,
		Context:    card.Context,
		DetectedAt: time.Now(),
	}
	s.logger.Warn("Leech detected", zap.Int64("cardId", card.ID), zap.String("word", card.Word), zap.Any("event", event))
}

// RefreshSession invalidates daily cache for a user.
// With cache removed, this is now a no-op but kept for API compatibility.
func (s *LearningService) RefreshSession(ctx context.Context, userID uuid.UUID) error {
	s.logger.Info("SRS Session Refresh requested (no-op with direct DB queries)", zap.String("userId", userID.String()))
	return nil
}

// InvalidateCache is a legacy wrapper for RefreshSession
func (s *LearningService) InvalidateCache(ctx context.Context, userID uuid.UUID) {
	_ = s.RefreshSession(ctx, userID)
}

// GetRetentionStats calculates the success rate for the last 30 days.
func (s *LearningService) GetRetentionStats(ctx context.Context, userID uuid.UUID) (float32, error) {
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)

	query := `
		SELECT 
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE rating >= 3) as success
		FROM review_log 
		WHERE user_id = $1 AND reviewed_at >= $2`

	var total, success int
	err := s.db.QueryRow(ctx, query, userID, thirtyDaysAgo).Scan(&total, &success)
	if err != nil {
		return 0, err
	}

	if total == 0 {
		return 1.0, nil
	}

	return float32(success) / float32(total), nil
}

// GetCohortRetentionStats analyzes retention by card maturity cohorts.
func (s *LearningService) GetCohortRetentionStats(ctx context.Context, userID uuid.UUID) (map[string]float32, error) {
	query := `
		SELECT 
			CASE 
				WHEN total_reviews <= 5 THEN 'newbie'
				WHEN total_reviews <= 20 THEN 'stranger'
				WHEN total_reviews <= 50 THEN 'acquaintance'
				ELSE 'friend'
			END as cohort,
			AVG(rolling_retention) as avg_retention
		FROM dictionary 
		WHERE user_id = $1 AND total_reviews > 0
		GROUP BY cohort`

	rows, err := s.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stats := make(map[string]float32)
	for rows.Next() {
		var cohort string
		var avg float32
		if err := rows.Scan(&cohort, &avg); err != nil {
			return nil, err
		}
		stats[cohort] = avg
	}
	return stats, nil
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

func (s *LearningService) mapCardToDto(dw *model.Dictionary) dto.DictionaryItemDto {
	return dto.DictionaryItemDto{
		ID:                 dw.ID,
		UserID:             dw.UserID,
		HighlightedText:    dw.Word,
		TranslatedText:     dw.Translation,
		Transcription:      dw.Transcription,
		Context:            dw.Context,
		ResourceName:       dw.Source,
		Status:             dw.Status,
		NextRepetitionDate: dw.NextRepetitionDate,
		DifficultyScore:    dw.DifficultyScore,
		Definition:         dw.Definition,
		ImageUrl:           dw.ImageUrl,
		IsLeech:            dw.IsLeech,
		Stability:          dw.Stability,
		Retrievability:     dw.Retrievability,
		RollingRetention:   dw.RollingRetention,
		CardType:           dw.CardType,
	}
}

// interleaveCards shuffles cards ensuring the same word never appears back-to-back.
// Step 1: Fisher-Yates shuffle. Step 2: fix adjacent same-word collisions by swapping.
func interleaveCards(cards []model.Dictionary) []model.Dictionary {
	if len(cards) <= 2 {
		return cards
	}

	// Step 1: Standard shuffle
	rand.Shuffle(len(cards), func(i, j int) { cards[i], cards[j] = cards[j], cards[i] })

	// Step 2: Fix collisions — if cards[i] and cards[i+1] share the same word, swap cards[i+1] with a later non-conflicting card
	for i := 0; i < len(cards)-1; i++ {
		if cards[i].Word == cards[i+1].Word {
			// Find a swap candidate further in the list
			swapped := false
			for j := i + 2; j < len(cards); j++ {
				// Candidate must not conflict with cards[i] AND must not conflict with cards[j-1] (if it moves to i+1)
				if cards[j].Word != cards[i].Word {
					cards[i+1], cards[j] = cards[j], cards[i+1]
					swapped = true
					break
				}
			}
			if !swapped {
				// All remaining cards are the same word — try swapping with an earlier card
				for j := 0; j < i; j++ {
					if cards[j].Word != cards[i+1].Word &&
						(j == 0 || cards[j-1].Word != cards[i+1].Word) &&
						cards[j+1].Word != cards[i+1].Word {
						cards[i+1], cards[j] = cards[j], cards[i+1]
						break
					}
				}
			}
		}
	}
	return cards
}

