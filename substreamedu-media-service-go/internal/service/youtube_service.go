package service

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"time"

	"github.com/substreamedu/substreamedu-media-service/internal/client"
	"github.com/substreamedu/substreamedu-media-service/internal/dto"
	"go.uber.org/zap"
)

type YouTubeService struct {
	client	*client.YouTubeClient
	logger	*zap.Logger
	clipSem	chan struct{}
}

func NewYouTubeService(client *client.YouTubeClient, logger *zap.Logger) *YouTubeService {
	return &YouTubeService{
		client:		client,
		logger:		logger,
		clipSem:	make(chan struct{}, 2),
	}
}

func (s *YouTubeService) GetVideoInfo(ctx context.Context, videoID string) (*dto.YoutubeVideoDto, error) {
	return s.client.GetVideoInfo(ctx, videoID)
}

func (s *YouTubeService) SearchVideos(ctx context.Context, query string) ([]dto.YoutubeVideoDto, error) {
	return s.client.SearchVideos(ctx, query)
}

var ytVideoIDRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]{11}$`)

func (s *YouTubeService) GetClip(ctx context.Context, videoID string, startSec, endSec float64) (string, error) {
	if !ytVideoIDRegex.MatchString(videoID) {
		return "", fmt.Errorf("invalid video ID: %s", videoID)
	}

	if startSec < 0 {
		startSec = 0
	}
	if endSec <= startSec {
		endSec = startSec + 10
	}
	if endSec-startSec > 30 {
		endSec = startSec + 30
	}

	cacheDir := "/app/temp/clips"
	if _, err := os.Stat("/app/temp"); os.IsNotExist(err) {
		cacheDir = filepath.Join(os.TempDir(), "substream_clips")
	}
	if err := os.MkdirAll(cacheDir, 0755); err != nil {
		s.logger.Warn("Failed to create clip cache dir, falling back to temp dir", zap.Error(err))
		cacheDir = os.TempDir()
	}

	cachePath := filepath.Join(cacheDir, fmt.Sprintf("%s_%.1f_%.1f.mp4", videoID, startSec, endSec))
	if info, err := os.Stat(cachePath); err == nil && info.Size() > 1024 {
		s.logger.Info("Clip cache hit", zap.String("videoId", videoID), zap.String("path", cachePath))
		return cachePath, nil
	}

	select {
	case s.clipSem <- struct{}{}:
		defer func() { <-s.clipSem }()
	case <-ctx.Done():
		return "", ctx.Err()
	}

	// Double check cache after acquiring semaphore
	if info, err := os.Stat(cachePath); err == nil && info.Size() > 1024 {
		return cachePath, nil
	}

	execCtx, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()

	s.logger.Info("Extracting YouTube video clip via yt-dlp",
		zap.String("videoId", videoID),
		zap.Float64("start", startSec),
		zap.Float64("end", endSec),
	)

	cmd := exec.CommandContext(execCtx, "yt-dlp",
		"--download-sections", fmt.Sprintf("*%.2f-%.2f", startSec, endSec),
		"-f", "bestvideo[height<=720]+bestaudio/best[height<=720]/best",
		"--merge-output-format", "mp4",
		"--force-overwrites",
		"--force-ipv4",
		"-o", cachePath,
		"https://www.youtube.com/watch?v="+videoID,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		s.logger.Warn("yt-dlp clip extraction returned error",
			zap.String("videoId", videoID),
			zap.Error(err),
			zap.String("output", string(output)),
		)
	}

	if info, statErr := os.Stat(cachePath); statErr == nil && info.Size() > 1024 {
		s.logger.Info("YouTube video clip extracted successfully", zap.String("path", cachePath), zap.Int64("bytes", info.Size()))
		return cachePath, nil
	}

	if err != nil {
		return "", fmt.Errorf("failed to extract video clip: %w (output: %s)", err, string(output))
	}
	return "", fmt.Errorf("video clip was not generated")
}
