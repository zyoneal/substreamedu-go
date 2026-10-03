// Package service provides business logic.
package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/substreamedu/wordstream-notification-service/internal/client"
	"github.com/substreamedu/wordstream-notification-service/internal/dto"
	"github.com/substreamedu/wordstream-notification-service/internal/kafka"
	"go.uber.org/zap"
)

// BotService provides business logic for the bot.
type BotService struct {
	iamClient  *client.IAMClient
	dictClient *client.DictionaryClient
	producer   *kafka.Producer
	logger     *zap.Logger
}

// NewBotService creates a new BotService.
func NewBotService(
	iamClient *client.IAMClient,
	dictClient *client.DictionaryClient,
	producer *kafka.Producer,
	logger *zap.Logger,
) *BotService {
	return &BotService{
		iamClient:  iamClient,
		dictClient: dictClient,
		producer:   producer,
		logger:     logger,
	}
}

// Authenticate authenticates a user by telegram token.
func (s *BotService) Authenticate(ctx context.Context, token string) (*dto.UserResponse, error) {
	return s.iamClient.GetUserByTelegramToken(ctx, token)
}

// GetRandomWord gets a random word for the user.
func (s *BotService) GetRandomWord(ctx context.Context, userID uuid.UUID) (*dto.DictionaryItemResponse, error) {
	return s.dictClient.GetRandomWord(ctx, userID)
}

// GetSrsCardsForToday gets SRS cards for today.
func (s *BotService) GetSrsCardsForToday(ctx context.Context, userID uuid.UUID) ([]dto.DictionaryItemResponse, error) {
	return s.dictClient.GetSrsCardsForToday(ctx, userID)
}

// GetStreak gets user's streak.
func (s *BotService) GetStreak(ctx context.Context, userID uuid.UUID) (int, error) {
	return s.dictClient.GetStreak(ctx, userID)
}

// GetDictionaryStats gets user's dictionary stats.
func (s *BotService) GetDictionaryStats(ctx context.Context, userID uuid.UUID) (*dto.DictionaryStatsResponse, error) {
	return s.dictClient.GetDictionaryStats(ctx, userID)
}

// RecordAnswer records user's answer and publishes event.
func (s *BotService) RecordAnswer(ctx context.Context, userID uuid.UUID, wordID int64, rating string, durationMs int) (*dto.ReviewResponse, error) {
	s.logger.Info("Recording answer",
		zap.String("userId", userID.String()),
		zap.Int64("wordId", wordID),
		zap.String("rating", rating),
		zap.Int("durationMs", durationMs),
	)

	// Synchronous update to Dictionary Service to ensure DB is updated immediately.
	// NOTE: Kafka publish removed — the dictionary-service consumer is disabled,
	// so events were piling up unread, growing log segments indefinitely.
	resp, err := s.dictClient.ReviewCard(ctx, userID, wordID, rating, durationMs)
	if err != nil {
		s.logger.Error("Failed to record answer via API", zap.Error(err))
		return nil, err
	}
	return resp, nil
}
