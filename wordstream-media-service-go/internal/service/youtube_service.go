// Package service provides business logic services.
package service

import (
	"context"

	"github.com/substreamedu/wordstream-media-service/internal/client"
	"github.com/substreamedu/wordstream-media-service/internal/dto"
	"go.uber.org/zap"
)

// YouTubeService handles YouTube-related business logic.
type YouTubeService struct {
	client *client.YouTubeClient
	logger *zap.Logger
}

// NewYouTubeService creates a new YouTubeService.
func NewYouTubeService(client *client.YouTubeClient, logger *zap.Logger) *YouTubeService {
	return &YouTubeService{
		client: client,
		logger: logger,
	}
}

func (s *YouTubeService) GetVideoInfo(ctx context.Context, videoID string) (*dto.YoutubeVideoDto, error) {
	return s.client.GetVideoInfo(ctx, videoID)
}

func (s *YouTubeService) SearchVideos(ctx context.Context, query string) ([]dto.YoutubeVideoDto, error) {
	return s.client.SearchVideos(ctx, query)
}

// SubtitleService handles subtitle-related business logic.
// (Additional methods will be implemented here)
