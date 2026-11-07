package client

import (
	"context"
	"fmt"

	"github.com/substreamedu/substreamedu-media-service/internal/config"
	"github.com/substreamedu/substreamedu-media-service/internal/dto"
	"go.uber.org/zap"
	"google.golang.org/api/option"
	"google.golang.org/api/youtube/v3"
)

type YouTubeClient struct {
	service	*youtube.Service
	logger	*zap.Logger
}

func NewYouTubeClient(cfg *config.YouTubeConfig, logger *zap.Logger) (*YouTubeClient, error) {
	if cfg.APIKey == "" {
		logger.Warn("YOUTUBE_API_KEY is empty. YouTube API integration will be disabled.")
		return &YouTubeClient{
			service:	nil,
			logger:		logger,
		}, nil
	}
	ctx := context.Background()
	service, err := youtube.NewService(ctx, option.WithAPIKey(cfg.APIKey))
	if err != nil {
		logger.Warn("Failed to create youtube service, running with disabled YouTube features", zap.Error(err))
		return &YouTubeClient{
			service:	nil,
			logger:		logger,
		}, nil
	}
	return &YouTubeClient{
		service:	service,
		logger:		logger,
	}, nil
}

func (c *YouTubeClient) GetVideoInfo(ctx context.Context, videoID string) (*dto.YoutubeVideoDto, error) {
	if c.service == nil {
		return nil, fmt.Errorf("youtube service is disabled (no API key configured)")
	}
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
		ID:		item.Id,
		Title:		item.Snippet.Title,
		Description:	item.Snippet.Description,
		ThumbnailURL:	item.Snippet.Thumbnails.High.Url,
		ViewCount:	fmt.Sprintf("%d", item.Statistics.ViewCount),
		LikeCount:	fmt.Sprintf("%d", item.Statistics.LikeCount),
		Duration:	item.ContentDetails.Duration,
	}, nil
}

func (c *YouTubeClient) SearchVideos(ctx context.Context, query string) ([]dto.YoutubeVideoDto, error) {
	if c.service == nil {
		return nil, fmt.Errorf("youtube service is disabled (no API key configured)")
	}
	call := c.service.Search.List([]string{"snippet"}).Q(query).Type("video").MaxResults(10)
	response, err := call.Context(ctx).Do()
	if err != nil {
		return nil, err
	}

	var results []dto.YoutubeVideoDto
	for _, item := range response.Items {
		results = append(results, dto.YoutubeVideoDto{
			ID:		item.Id.VideoId,
			Title:		item.Snippet.Title,
			Description:	item.Snippet.Description,
			ThumbnailURL:	item.Snippet.Thumbnails.High.Url,
		})
	}
	return results, nil
}
