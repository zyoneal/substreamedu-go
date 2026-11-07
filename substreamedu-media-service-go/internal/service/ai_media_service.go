package service

import (
	"context"
	"time"

	"github.com/substreamedu/substreamedu-media-service/internal/client"
	"github.com/substreamedu/substreamedu-media-service/internal/dto"
	"go.uber.org/zap"
)

type AiMediaService struct {
	deepSeekClient	*client.DeepSeekClient
	logger		*zap.Logger
}

func NewAiMediaService(deepSeekClient *client.DeepSeekClient, logger *zap.Logger) *AiMediaService {
	return &AiMediaService{
		deepSeekClient:	deepSeekClient,
		logger:		logger,
	}
}

func (s *AiMediaService) GenerateEducationalText(ctx context.Context, request dto.GenerateTextRequest) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	return s.deepSeekClient.GenerateEducationalText(ctx, request)
}

