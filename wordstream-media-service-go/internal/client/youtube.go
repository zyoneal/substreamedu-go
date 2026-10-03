// Package client provides external API clients.
package client

import (
	"context"
	"fmt"

	"github.com/substreamedu/wordstream-media-service/internal/config"
	"github.com/substreamedu/wordstream-media-service/internal/dto"
	"go.uber.org/zap"
	"google.golang.org/api/option"
	"google.golang.org/api/youtube/v3"
)

// YouTubeClient handles interactions with YouTube Data API.
type YouTubeClient struct {
	service *youtube.Service
	logger  *zap.Logger
}

// NewYouTubeClient creates a new YouTubeClient.
func NewYouTubeClient(cfg *config.YouTubeConfig, logger *zap.Logger) (*YouTubeClient, error) {
	ctx := context.Background()
	service, err := youtube.NewService(ctx, option.WithAPIKey(cfg.APIKey))
	if err != nil {
		return nil, fmt.Errorf("failed to create youtube service: %w", err)
	}
	return &YouTubeClient{
		service: service,
		logger:  logger,
	}, nil
}

// GetVideoInfo fetches video metadata.
func (c *YouTubeClient) GetVideoInfo(ctx context.Context, videoID string) (*dto.YoutubeVideoDto, error) {
	call := c.service.Videos.List([]string{"snippet", "contentDetails", "statistics"}).Id(videoID)
	response, err := call.Context(ctx).Do()
	if err != nil {
		return nil, err
	}

	if len(response.Items) == 0 {
		return nil, fmt.Errorf("video not found: %s", videoID)
	}

	item := response.Items[0]
	return &dto.YoutubeVideoDto{
		ID:           item.Id,
		Title:        item.Snippet.Title,
		Description:  item.Snippet.Description,
		ThumbnailURL: item.Snippet.Thumbnails.High.Url,
		ViewCount:    fmt.Sprintf("%d", item.Statistics.ViewCount),
		LikeCount:    fmt.Sprintf("%d", item.Statistics.LikeCount),
		Duration:     item.ContentDetails.Duration,
	}, nil
}

// SearchVideos searches for videos based on query.
func (c *YouTubeClient) SearchVideos(ctx context.Context, query string) ([]dto.YoutubeVideoDto, error) {
	call := c.service.Search.List([]string{"snippet"}).Q(query).Type("video").MaxResults(10)
	response, err := call.Context(ctx).Do()
	if err != nil {
		return nil, err
	}

	var results []dto.YoutubeVideoDto
	for _, item := range response.Items {
		results = append(results, dto.YoutubeVideoDto{
			ID:           item.Id.VideoId,
			Title:        item.Snippet.Title,
			Description:  item.Snippet.Description,
			ThumbnailURL: item.Snippet.Thumbnails.High.Url,
		})
	}
	return results, nil
}
