package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"go.uber.org/zap"
)

// LyricsResponse represents the response matching Java DTO.
type LyricsResponse struct {
	Lyrics string `json:"lyrics"`
	Source string `json:"source"`
	Artist string `json:"artist"`
	Title  string `json:"title"`
}

// LyricsService scrapers lyrics from multiple sources.
type LyricsService struct {
	logger *zap.Logger
}

// NewLyricsService creates a new LyricsService.
func NewLyricsService(logger *zap.Logger) *LyricsService {
	return &LyricsService{logger: logger}
}

// GetLyrics attempts to fetch lyrics from multiple providers.
func (s *LyricsService) GetLyrics(ctx context.Context, artist, title string) (*LyricsResponse, error) {
	s.logger.Info("Searching lyrics", zap.String("artist", artist), zap.String("title", title))

	// Implementation order: LrcLib -> Lyrics.ovh
	if res := s.tryLrcLib(ctx, artist, title); res != nil {
		return res, nil
	}
	if res := s.tryLyricsOvh(ctx, artist, title); res != nil {
		return res, nil
	}

	return nil, nil
}

func (s *LyricsService) tryLrcLib(ctx context.Context, artist, title string) *LyricsResponse {
	query := url.QueryEscape(artist + " " + title)
	apiURL := fmt.Sprintf("https://lrclib.net/api/search?q=%s", query)

	req, _ := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return nil
	}
	defer resp.Body.Close()

	var results []struct {
		ID          int    `json:"id"`
		PlainLyrics string `json:"plainLyrics"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil || len(results) == 0 {
		return nil
	}

	if results[0].PlainLyrics != "" {
		return &LyricsResponse{
			Lyrics: results[0].PlainLyrics,
			Source: "lrclib",
			Artist: artist,
			Title:  title,
		}
	}
	return nil
}

func (s *LyricsService) tryLyricsOvh(ctx context.Context, artist, title string) *LyricsResponse {
	// encode artist/title twice to be safe or just use url.PathEscape
	apiURL := fmt.Sprintf("https://api.lyrics.ovh/v1/%s/%s", url.PathEscape(artist), url.PathEscape(title))

	req, _ := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return nil
	}
	defer resp.Body.Close()

	var result struct {
		Lyrics string `json:"lyrics"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil || result.Lyrics == "" {
		return nil
	}

	return &LyricsResponse{
		Lyrics: result.Lyrics,
		Source: "lyrics.ovh",
		Artist: artist,
		Title:  title,
	}
}
