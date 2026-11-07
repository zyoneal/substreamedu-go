package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-notification-service/internal/client"
	"github.com/substreamedu/substreamedu-notification-service/internal/dto"
	"github.com/substreamedu/substreamedu-notification-service/internal/kafka"
	"go.uber.org/zap"
)

type BotService struct {
	iamClient	*client.IAMClient
	dictClient	*client.DictionaryClient
	producer	*kafka.Producer
	logger		*zap.Logger
}

func NewBotService(
	iamClient *client.IAMClient,
	dictClient *client.DictionaryClient,
	producer *kafka.Producer,
	logger *zap.Logger,
) *BotService {
	return &BotService{
		iamClient:	iamClient,
		dictClient:	dictClient,
		producer:	producer,
		logger:		logger,
	}
}

func (s *BotService) Authenticate(ctx context.Context, token string) (*dto.UserResponse, error) {
	return s.iamClient.GetUserByTelegramToken(ctx, token)
}

func (s *BotService) GetRandomWord(ctx context.Context, userID uuid.UUID) (*dto.DictionaryItemResponse, error) {
	return s.dictClient.GetRandomWord(ctx, userID)
}

func (s *BotService) GetSrsCardsForToday(ctx context.Context, userID uuid.UUID) ([]dto.DictionaryItemResponse, error) {
	return s.dictClient.GetSrsCardsForToday(ctx, userID)
}

func (s *BotService) GetStreak(ctx context.Context, userID uuid.UUID) (int, error) {
	return s.dictClient.GetStreak(ctx, userID)
}

func (s *BotService) GetDictionaryStats(ctx context.Context, userID uuid.UUID) (*dto.DictionaryStatsResponse, error) {
	return s.dictClient.GetDictionaryStats(ctx, userID)
}

func (s *BotService) RecordAnswer(ctx context.Context, userID uuid.UUID, wordID int64, rating string, durationMs int) (*dto.ReviewResponse, error) {
	s.logger.Info("Recording answer",
		zap.String("userId", userID.String()),
		zap.Int64("wordId", wordID),
		zap.String("rating", rating),
		zap.Int("durationMs", durationMs),
	)

	resp, err := s.dictClient.ReviewCard(ctx, userID, wordID, rating, durationMs)
	if err != nil {
		s.logger.Error("Failed to record answer via API", zap.Error(err))
		return nil, err
	}
	return resp, nil
}
