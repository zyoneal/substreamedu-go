package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-media-service/internal/dto"
	"github.com/substreamedu/substreamedu-media-service/internal/model"
	"github.com/substreamedu/substreamedu-media-service/internal/parser"
	"github.com/substreamedu/substreamedu-media-service/internal/repository"
	"github.com/substreamedu/substreamedu-media-service/internal/staticsubtitles"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"time"
)

type TranscriptFetcher interface {
	FetchTranscript(ctx context.Context, videoID string) ([]dto.SubtitleResponseDto, error)
}

type SubtitleService struct {
	repo			*repository.SubtitleRepository
	transcriptFetcher	TranscriptFetcher
	redis			*redis.Client
	logger			*zap.Logger
}

func NewSubtitleService(repo *repository.SubtitleRepository, transcriptFetcher TranscriptFetcher, redis *redis.Client, logger *zap.Logger) *SubtitleService {
	return &SubtitleService{
		repo:			repo,
		transcriptFetcher:	transcriptFetcher,
		redis:			redis,
		logger:			logger,
	}
}

func (s *SubtitleService) UploadSubtitles(ctx context.Context, userID uuid.UUID, fileName string, content string) error {
	exists, err := s.repo.ExistsByUserIdAndName(ctx, userID, fileName)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	lines := strings.Split(content, "\n")
	var parsedSubs []dto.SubtitleResponseDto
	if strings.HasSuffix(strings.ToLower(fileName), ".srt") {
		parsedSubs = parser.ParseSrt(lines)
	} else if strings.HasSuffix(strings.ToLower(fileName), ".vtt") {
		parsedSubs = parser.ParseVtt(lines)
	} else {
		return fmt.Errorf("unsupported subtitle format: %s", fileName)
	}

	var subtitles []model.Subtitle
	for _, ps := range parsedSubs {
		subtitles = append(subtitles, model.Subtitle{
			UserID:		userID,
			Name:		fileName,
			StartTimeMs:	ps.StartTimeMs,
			EndTimeMs:	ps.EndTimeMs,
			Text:		ps.Text,
		})
	}

	err = s.repo.SaveAll(ctx, subtitles)
	if err == nil {
		s.invalidateCache(ctx, userID)
	}
	return err
}

func (s *SubtitleService) GetSubtitles(ctx context.Context, userID uuid.UUID, name string) ([]string, error) {
	return s.repo.FindTextsByName(ctx, userID, name)
}

func (s *SubtitleService) GetAll(ctx context.Context, userID uuid.UUID) ([]dto.SubtitleDto, error) {
	cacheKey := fmt.Sprintf("subtitles:%s", userID)

	if s.redis != nil {
		cached, err := s.redis.SMembers(ctx, cacheKey).Result()
		if err == nil && len(cached) > 0 {
			var res []dto.SubtitleDto
			for _, n := range cached {
				res = append(res, dto.SubtitleDto{Name: n})
			}
			return res, nil
		}
	}

	names, err := s.repo.FindDistinctSubtitleNames(ctx, userID)
	if err != nil {
		return nil, err
	}

	if s.redis != nil && len(names) > 0 {

		interfaces := make([]interface{}, len(names))
		for i, n := range names {
			interfaces[i] = n
		}
		s.redis.SAdd(ctx, cacheKey, interfaces...)
		s.redis.Expire(ctx, cacheKey, 30*time.Minute)
	}

	var res []dto.SubtitleDto
	for _, n := range names {
		res = append(res, dto.SubtitleDto{Name: n})
	}
	return res, nil
}

func (s *SubtitleService) GetSubtitlesForVideo(ctx context.Context, userID uuid.UUID, name string) ([]dto.SubtitleResponseDto, error) {
	subs, err := s.repo.FindByUserIdAndNameOrderByStartTimeMs(ctx, userID, name)
	if err != nil {
		return nil, err
	}

	var res []dto.SubtitleResponseDto
	for _, sub := range subs {
		res = append(res, dto.SubtitleResponseDto{
			ID:		sub.ID,
			Name:		sub.Name,
			StartTimeMs:	sub.StartTimeMs,
			EndTimeMs:	sub.EndTimeMs,
			Text:		sub.Text,
		})
	}
	return res, nil
}

func (s *SubtitleService) DeleteByUserIdAndName(ctx context.Context, userID uuid.UUID, name string) error {
	err := s.repo.DeleteByUserIdAndName(ctx, userID, name)
	if err == nil {
		s.invalidateCache(ctx, userID)
	}
	return err
}

func (s *SubtitleService) invalidateCache(ctx context.Context, userID uuid.UUID) {
	if s.redis != nil {
		cacheKey := fmt.Sprintf("subtitles:%s", userID)
		s.redis.Del(ctx, cacheKey)
	}
}

func (s *SubtitleService) GetSubtitlesForYoutubeVideo(ctx context.Context, videoID string) ([]dto.SubtitleResponseDto, error) {
	if preset, ok := staticsubtitles.Get(videoID); ok {
		s.logger.Info("Using embedded preset subtitles for curated video", zap.String("videoId", videoID), zap.Int("count", len(preset)))
		return preset, nil
	}

	if s.transcriptFetcher == nil {
		s.logger.Warn("Transcript fetcher not initialized", zap.String("videoId", videoID))
		return []dto.SubtitleResponseDto{}, nil
	}

	result, err := s.transcriptFetcher.FetchTranscript(ctx, videoID)
	if err != nil {
		s.logger.Error("Failed to fetch YouTube transcript",
			zap.String("videoId", videoID),
			zap.Error(err))
		return []dto.SubtitleResponseDto{}, nil
	}

	return result, nil
}

func (s *SubtitleService) CountUploadedSubtitles(ctx context.Context, userID uuid.UUID) (int, error) {
	return s.repo.CountDistinctNamesByUserId(ctx, userID)
}
