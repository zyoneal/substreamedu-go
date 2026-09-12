package client

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/substreamedu/substreamedu-media-service/internal/config"
	"github.com/substreamedu/substreamedu-media-service/internal/dto"
	"go.uber.org/zap"
)

type SpotifyClient struct {
	cfg		*config.SpotifyConfig
	logger		*zap.Logger
	accessToken	string
	mu		sync.RWMutex
}

func NewSpotifyClient(cfg *config.SpotifyConfig, logger *zap.Logger) *SpotifyClient {
	return &SpotifyClient{
		cfg:	cfg,
		logger:	logger,
	}
}

func (c *SpotifyClient) getAccessToken(ctx context.Context) (string, error) {
	c.mu.RLock()
	if c.accessToken != "" {
		c.mu.RUnlock()
		return c.accessToken, nil
	}
	c.mu.RUnlock()

	c.mu.Lock()
	defer c.mu.Unlock()

	if c.accessToken != "" {
		return c.accessToken, nil
	}

	data := url.Values{}
	data.Set("grant_type", "client_credentials")
	data.Set("client_id", c.cfg.ClientID)
	data.Set("client_secret", c.cfg.ClientSecret)

	req, err := http.NewRequestWithContext(ctx, "POST", "https://accounts.spotify.com/api/token", strings.NewReader(data.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("spotify auth failed: %s", resp.Status)
	}

	var result struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	c.accessToken = result.AccessToken
	return c.accessToken, nil
}

func (c *SpotifyClient) SearchTracks(ctx context.Context, query string) ([]dto.MusicTrackDto, error) {
	token, err := c.getAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	apiURL := fmt.Sprintf("https://api.spotify.com/v1/search?type=track&q=%s", url.QueryEscape(query))
	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Tracks struct {
			Items []struct {
				ID		string	`json:"id"`
				Name		string	`json:"name"`
				DurationMs	int	`json:"duration_ms"`
				PreviewURL	string	`json:"preview_url"`
				Album		struct {
					Name	string	`json:"name"`
					Images	[]struct {
						URL string `json:"url"`
					}	`json:"images"`
				}	`json:"album"`
				Artists	[]struct {
					Name string `json:"name"`
				}	`json:"artists"`
				ExternalURLs	struct {
					Spotify string `json:"spotify"`
				}	`json:"external_urls"`
			} `json:"items"`
		} `json:"tracks"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var tracks []dto.MusicTrackDto
	for _, item := range result.Tracks.Items {
		artist := "Unknown"
		if len(item.Artists) > 0 {
			artist = item.Artists[0].Name
		}
		image := ""
		if len(item.Album.Images) > 0 {
			image = item.Album.Images[0].URL
		}

		tracks = append(tracks, dto.MusicTrackDto{
			ID:		item.ID,
			Title:		item.Name,
			Artist:		artist,
			Album:		item.Album.Name,
			DurationMs:	item.DurationMs,
			PreviewURL:	item.PreviewURL,
			ImageURL:	image,
			ExternalURL:	item.ExternalURLs.Spotify,
		})
	}
	return tracks, nil
}
