package client

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/substreamedu/substreamedu-media-service/internal/config"
	"github.com/substreamedu/substreamedu-media-service/internal/dto"
	"go.uber.org/zap"
)

var (
	sharedSubDLClient = &http.Client{
		Timeout:	15 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:		100,
			MaxIdleConnsPerHost:	10,
			IdleConnTimeout:	90 * time.Second,
		},
	}
)

type SubDLClient struct {
	cfg	*config.SubDLConfig
	logger	*zap.Logger
}

func NewSubDLClient(cfg *config.SubDLConfig, logger *zap.Logger) *SubDLClient {
	return &SubDLClient{
		cfg:	cfg,
		logger:	logger,
	}
}

func (c *SubDLClient) SearchSubtitles(ctx context.Context, filmName, languages, filmType string, season, episode, year *int, imdbId, tmdbId *string, sdId *int) (*dto.SubDLSearchResponse, error) {
	params := url.Values{}
	params.Add("api_key", c.cfg.APIKey)

	if sdId != nil && *sdId != 0 {
		params.Add("sd_id", strconv.Itoa(*sdId))
	} else if imdbId != nil && *imdbId != "" {
		params.Add("imdb_id", *imdbId)
	} else if tmdbId != nil && *tmdbId != "" {
		params.Add("tmdb_id", *tmdbId)
	} else {
		params.Add("film_name", filmName)
	}

	params.Add("languages", languages)
	params.Add("type", filmType)

	if season != nil {
		params.Add("season_number", strconv.Itoa(*season))
	}
	if episode != nil {
		params.Add("episode_number", strconv.Itoa(*episode))
	}
	if year != nil && *year > 1900 {
		params.Add("year", strconv.Itoa(*year))
	}

	searchURL := fmt.Sprintf("%s/subtitles?%s", c.cfg.BaseURL, params.Encode())

	req, err := http.NewRequestWithContext(ctx, "GET", searchURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := sharedSubDLClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("subdl api error: %s", resp.Status)
	}

	var result dto.SubDLSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}
