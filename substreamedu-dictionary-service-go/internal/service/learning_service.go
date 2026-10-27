package service

import (
	"context"
	"fmt"
	"math/rand"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/model"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/repository"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/service/fsrs"
	"go.uber.org/zap"
)

type LearningService struct {
	repo		*repository.DictionaryRepository
	outboxService	*OutboxService
	fsrsEngine	*fsrs.Engine
	db		*pgxpool.Pool
	redis		*redis.Client
	aiService	*AIService
	logger		*zap.Logger
}

func NewLearningService(repo *repository.DictionaryRepository, outbox *OutboxService, engine *fsrs.Engine, db *pgxpool.Pool, rdb *redis.Client, aiService *AIService, logger *zap.Logger) *LearningService {
	return &LearningService{
		repo:		repo,
		outboxService:	outbox,
		fsrsEngine:	engine,
		db:		db,
		redis:		rdb,
		aiService:	aiService,
		logger:		logger,
	}
}

const (
	SessionLimit       = 50
	DefaultMaxNewWords = 15 // 15 words = 30 cards (Recognition + Production)
)

// ComputeTargetNewCards calculates how many new cards to include in a daily session
// based on due review count, session ceiling, and maximum new words quota.
func ComputeTargetNewCards(reviewCount, sessionLimit, maxNewWords int) int {
	remainingSlots := sessionLimit - reviewCount
	if remainingSlots < 0 {
		remainingSlots = 0
	}
	maxNewAllowed := maxNewWords * 2
	if remainingSlots > maxNewAllowed {
		return maxNewAllowed
	}
	return remainingSlots
}

// SplitNewCardQuota returns how many of the targetNew new cards may be recognition (non-production)
// cards. It is capped at maxNewWords so a new word's production card cannot double the number of
// new words introduced per day; unlocked production cards fill whatever budget remains.
func SplitNewCardQuota(targetNew, maxNewWords int) int {
	if targetNew <= 0 {
		return 0
	}
	if targetNew > maxNewWords {
		return maxNewWords
	}
	return targetNew
}

// productionGateEnabled reports whether production cards are held back until their recognition
// sibling has graduated. Set SRS_GATE_PRODUCTION_CARDS=false to restore the legacy selection
// without a deploy of data or schema changes (Spec 57 R3).
func productionGateEnabled() bool {
	return os.Getenv("SRS_GATE_PRODUCTION_CARDS") != "false"
}

// selectNewCards picks up to targetNew new cards. With the gate on, day one of a new word is
// recognition only; its production card appears once recognition reaches 'review'.
// Any query failure degrades to the legacy selection so a session never fails because of the gate.
func (s *LearningService) selectNewCards(ctx context.Context, userID uuid.UUID, targetNew int) []model.Dictionary {
	legacy := func() []model.Dictionary {
		newWords, err := s.repo.FindRandomNewWords(ctx, userID, targetNew)
		if err != nil {
			s.logger.Warn("Failed to fetch new words, proceeding with reviews only", zap.Error(err))
			return nil
		}
		return newWords
	}

	if !productionGateEnabled() {
		return legacy()
	}

	recognition, err := s.repo.FindNewRecognitionCards(ctx, userID, SplitNewCardQuota(targetNew, DefaultMaxNewWords))
	if err != nil {
		s.logger.Warn("Gated new-card selection failed, falling back to legacy selection", zap.Error(err))
		return legacy()
	}

	selected := recognition
	if remaining := targetNew - len(recognition); remaining > 0 {
		production, err := s.repo.FindUnlockedNewProductionCards(ctx, userID, remaining)
		if err != nil {
			s.logger.Warn("Failed to fetch unlocked production cards, continuing without them", zap.Error(err))
		} else {
			selected = append(selected, production...)
		}
	}
	return selected
}

func (s *LearningService) GetDailyCards(ctx context.Context, userID uuid.UUID, loc *time.Location) (*dto.DailySessionDto, error) {
	if loc == nil {
		loc = time.UTC
	}
	now := time.Now().In(loc)
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
	dueCutoff := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999999999, loc)

	totalCount, _ := s.repo.CountTotalWords(ctx, userID)

	reviewBatch, reviewErr := s.repo.FindDueWordsSorted(ctx, userID, todayStart, dueCutoff, SessionLimit)
	if reviewErr != nil {
		return nil, fmt.Errorf("failed to fetch due words: %w", reviewErr)
	}

	targetNew := ComputeTargetNewCards(len(reviewBatch), SessionLimit, DefaultMaxNewWords)

	var newWords []model.Dictionary
	if targetNew > 0 {
		newWords = s.selectNewCards(ctx, userID, targetNew)
	}

	finalBatch := append(reviewBatch, newWords...)
	finalBatch = interleaveCards(finalBatch)

	cards := make([]dto.DictionaryItemDto, 0, len(finalBatch))
	for _, dw := range finalBatch {
		cards = append(cards, s.mapCardToDto(&dw))
	}

	result := &dto.DailySessionDto{
		Cards:			cards,
		TotalDictionarySize:	totalCount,
	}

	return result, nil
}

func (s *LearningService) ReviewCard(ctx context.Context, cardID int64, rating string, responseTimeMs int) (*dto.ReviewResponseDto, error) {
	card, err := s.repo.FindByID(ctx, cardID)
	if err != nil {
		return nil, err
	}

	stabilityBefore := card.Stability
	difficultyBefore := card.EaseFactor
	stateBefore := card.Status
	stateBeforeWasLeech := card.IsLeech
	totalReviewsBefore := card.TotalReviews

	now := time.Now().UTC()
	var elapsedDays float32
	if card.LastReviewed != nil {
		elapsedDays = float32(now.Sub(*card.LastReviewed).Hours() / 24.0)
	}

	state := cardStateFromDictionary(card)

	fsrsRating := fsrs.UserRating(rating)
	result := s.fsrsEngine.Review(&state, fsrsRating, responseTimeMs, nil)

	applyCardStateToDictionary(&state, card)

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

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	ratingInt := 3
	if rating == "forgot" {
		ratingInt = 1
	}

	reviewLog := &model.ReviewLog{
		UserID:			card.UserID,
		CardID:			card.ID,
		ReviewedAt:		now,
		Rating:			ratingInt,
		ResponseTimeMs:		responseTimeMs,
		StabilityBefore:	stabilityBefore,
		DifficultyBefore:	difficultyBefore,
		ElapsedDays:		elapsedDays,
		ScheduledDays:		float32(result.NextIntervalDays),
		State:			stateBefore,
	}

	if err := s.repo.SaveReviewLog(ctx, tx, reviewLog); err != nil {
		s.logger.Error("Failed to save review log", zap.Error(err), zap.Int64("cardId", card.ID))
		return nil, err
	}

	ReviewsTotal.WithLabelValues(rating, card.Status).Inc()

	event := dto.WordReviewedEvent{
		UserID:		card.UserID,
		CardID:		card.ID,
		Rating:		rating,
		ReviewedAt:	now,
	}
	if err := s.outboxService.SaveEvent(ctx, tx, card.UserID.String(), "WORD_REVIEWED", event, "word-reviewed-events"); err != nil {
		return nil, err
	}

	if err := s.repo.SaveTxOptimistic(ctx, tx, card, totalReviewsBefore); err != nil {
		s.logger.Error("Failed to save reviewed card", zap.Error(err), zap.Int64("cardId", card.ID))
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	s.InvalidateCache(ctx, card.UserID)

	response := &dto.ReviewResponseDto{
		Card:			s.mapCardToDto(card),
		RepeatInSession:	result.RepeatInSession,
		NextIntervalDays:	result.NextIntervalDays,
		Stability:		card.Stability,
		Retrievability:		card.Retrievability,
		RollingRetention:	card.RollingRetention,
		IsLeech:		card.IsLeech,
		CardType:		card.CardType,
	}

	if card.IsLeech && !stateBeforeWasLeech {
		s.publishLeechEvent(ctx, card)
	}

	return response, nil
}

func (s *LearningService) publishLeechEvent(ctx context.Context, card *model.Dictionary) {
	event := dto.LeechDetectedEvent{
		UserID:		card.UserID,
		CardID:		card.ID,
		Word:		card.Word,
		Context:	card.Context,
		DetectedAt:	time.Now(),
	}
	s.logger.Warn("Leech detected", zap.Int64("cardId", card.ID), zap.String("word", card.Word), zap.Any("event", event))
}

func (s *LearningService) RefreshSession(ctx context.Context, userID uuid.UUID) error {
	if s.redis != nil {
		iter := s.redis.Scan(ctx, 0, fmt.Sprintf("srs:stats:%s*", userID.String()), 0).Iterator()
		for iter.Next(ctx) {
			s.redis.Del(ctx, iter.Val())
		}
		s.redis.Del(ctx, "srs:stats:"+userID.String())
	}
	if s.logger != nil {
		s.logger.Info("SRS Session Refresh requested (no-op with direct DB queries)", zap.String("userId", userID.String()))
	}
	return nil
}

func (s *LearningService) InvalidateCache(ctx context.Context, userID uuid.UUID) {
	_ = s.RefreshSession(ctx, userID)
}

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

func cardStateFromDictionary(d *model.Dictionary) fsrs.CardState {
	return fsrs.CardState{
		Status:			d.Status,
		EaseFactor:		d.EaseFactor,
		Interval:		d.Interval,
		Stability:		d.Stability,
		Retrievability:		d.Retrievability,
		RepetitionLevel:	d.RepetitionLevel,
		LearningStep:		d.LearningStep,
		LearningDue:		d.LearningDue,
		NextRepetitionDate:	d.NextRepetitionDate,
		LastReviewed:		d.LastReviewed,
		TotalReviews:		d.TotalReviews,
		CorrectReviews:		d.CorrectReviews,
		ConsecutiveSuccess:	d.ConsecutiveSuccess,
		Lapses:			d.Lapses,
		HardCount:		d.HardCount,
		RollingRetention:	d.RollingRetention,
		DifficultyScore:	d.DifficultyScore,
		IsLeech:		d.IsLeech,
	}
}

func applyCardStateToDictionary(state *fsrs.CardState, d *model.Dictionary) {
	d.Status = state.Status
	d.EaseFactor = state.EaseFactor
	d.Interval = state.Interval
	d.Stability = state.Stability
	d.Retrievability = state.Retrievability
	d.RepetitionLevel = state.RepetitionLevel
	d.LearningStep = state.LearningStep
	d.LearningDue = state.LearningDue
	d.NextRepetitionDate = state.NextRepetitionDate
	d.LastReviewed = state.LastReviewed
	d.TotalReviews = state.TotalReviews
	d.CorrectReviews = state.CorrectReviews
	d.ConsecutiveSuccess = state.ConsecutiveSuccess
	d.Lapses = state.Lapses
	d.HardCount = state.HardCount
	d.RollingRetention = state.RollingRetention
	d.DifficultyScore = state.DifficultyScore
	d.IsLeech = state.IsLeech
}

func algorithmParamsFromModel(p *model.UserSRSParameters) *fsrs.AlgorithmParams {
	if p == nil {
		return nil
	}
	return &fsrs.AlgorithmParams{
		W0:	p.W0, W1: p.W1, W2: p.W2, W3: p.W3,
		W4:	p.W4, W5: p.W5, W6: p.W6, W7: p.W7,
		W8:	p.W8, W9: p.W9, W10: p.W10,
		W11:	p.W11, W12: p.W12, W13: p.W13, W14: p.W14,
	}
}

func (s *LearningService) mapCardToDto(dw *model.Dictionary) dto.DictionaryItemDto {
	return dto.DictionaryItemDto{
		ID:			dw.ID,
		UserID:			dw.UserID,
		HighlightedText:	dw.Word,
		TranslatedText:		dw.Translation,
		Transcription:		dw.Transcription,
		Context:		dw.Context,
		ResourceName:		dw.Source,
		Status:			dw.Status,
		NextRepetitionDate:	dw.NextRepetitionDate,
		DifficultyScore:	dw.DifficultyScore,
		Definition:		dw.Definition,
		ImageUrl:		dw.ImageUrl,
		IsLeech:		dw.IsLeech,
		Stability:		dw.Stability,
		Retrievability:		dw.Retrievability,
		RollingRetention:	dw.RollingRetention,
		CardType:		dw.CardType,
	}
}

func interleaveCards(cards []model.Dictionary) []model.Dictionary {
	if len(cards) <= 2 {
		return cards
	}

	rand.Shuffle(len(cards), func(i, j int) { cards[i], cards[j] = cards[j], cards[i] })

	for i := 0; i < len(cards)-1; i++ {
		if cards[i].Word == cards[i+1].Word {

			swapped := false
			for j := i + 2; j < len(cards); j++ {

				if cards[j].Word != cards[i].Word {
					cards[i+1], cards[j] = cards[j], cards[i+1]
					swapped = true
					break
				}
			}
			if !swapped {

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
