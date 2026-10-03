package service

import (
	"context"

	"github.com/substreamedu/wordstream-media-service/internal/client"
	"github.com/substreamedu/wordstream-media-service/internal/dto"
	"go.uber.org/zap"
)

// AiMediaService handles AI-related content generation.
type AiMediaService struct {
	deepSeekClient *client.DeepSeekClient
	logger         *zap.Logger
}

// NewAiMediaService creates a new AiMediaService.
func NewAiMediaService(deepSeekClient *client.DeepSeekClient, logger *zap.Logger) *AiMediaService {
	return &AiMediaService{
		deepSeekClient: deepSeekClient,
		logger:         logger,
	}
}

// GenerateEducationalText generates text for language learning.
func (s *AiMediaService) GenerateEducationalText(ctx context.Context, request dto.GenerateTextRequest) (string, error) {
	return s.deepSeekClient.GenerateEducationalText(ctx, request)
}
