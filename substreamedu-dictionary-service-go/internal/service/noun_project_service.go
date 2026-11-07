package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/sony/gobreaker"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/resilience"
	"go.uber.org/zap"
)

type NounProjectService struct {
	apiKey		string
	apiSecret	string
	pixabayKey	string
	logger		*zap.Logger
	pixabayBaseURL	string
	iconifyBaseURL	string
	pixabayBreaker	*gobreaker.CircuitBreaker
	iconifyBreaker	*gobreaker.CircuitBreaker
}

func NewNounProjectService(apiKey, apiSecret, pixabayKey string, logger *zap.Logger) *NounProjectService {
	return &NounProjectService{
		apiKey:		apiKey,
		apiSecret:	apiSecret,
		pixabayKey:	pixabayKey,
		logger:		logger,
		pixabayBaseURL:	"https://pixabay.com/api/",
		iconifyBaseURL:	"https://api.iconify.design",
		pixabayBreaker:	resilience.NewCircuitBreaker("pixabay-api", logger),
		iconifyBreaker:	resilience.NewCircuitBreaker("iconify-api", logger),
	}
}

func (s *NounProjectService) getLogger(ctx context.Context) *zap.Logger {
	if l, ok := ctx.Value("logger").(*zap.Logger); ok {
		return l
	}
	return s.logger
}

type PixabayResponse struct {
	Hits []struct {
		PreviewURL	string	`json:"previewURL"`
		WebformatURL	string	`json:"webformatURL"`
	} `json:"hits"`
}

type IconifyResponse struct {
	Icons []string `json:"icons"`
}

func (s *NounProjectService) GetIcon(ctx context.Context, word string) (string, error) {
	logger := s.getLogger(ctx)
	if word == "" {
		return "", nil
	}

	if s.pixabayKey != "" {
		imageUrl, err := s.getPixabayIcon(ctx, word)
		if err == nil && imageUrl != "" {
			logger.Debug("Successfully fetched icon from Pixabay", zap.String("word", word), zap.String("url", imageUrl))
			return imageUrl, nil
		}
		if err != nil {
			logger.Warn("Pixabay fetch failed, falling back to Iconify", zap.Error(err), zap.String("word", word))
		} else {
			logger.Debug("Pixabay returned zero hits, falling back to Iconify", zap.String("word", word))
		}
	} else {
		logger.Debug("Pixabay key not configured, using Iconify directly", zap.String("word", word))
	}

	imageUrl, err := s.getIconifyIcon(ctx, word)
	if err != nil {
		logger.Error("Iconify fetch failed", zap.Error(err), zap.String("word", word))
		return "", err
	}

	if imageUrl != "" {
		logger.Debug("Successfully fetched icon from Iconify", zap.String("word", word), zap.String("url", imageUrl))
	} else {
		logger.Debug("No icon found in either Pixabay or Iconify", zap.String("word", word))
	}

	return imageUrl, nil
}

func (s *NounProjectService) getPixabayIcon(ctx context.Context, word string) (string, error) {
	result, err := s.pixabayBreaker.Execute(func() (interface{}, error) {
		reqURL := fmt.Sprintf("%s?key=%s&q=%s&image_type=vector&safesearch=true&per_page=3",
			s.pixabayBaseURL, s.pixabayKey, url.QueryEscape(word))

		req, err := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
		if err != nil {
			return "", err
		}

		client := &http.Client{Timeout: 3 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return "", err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return "", fmt.Errorf("Pixabay API returned status %d", resp.StatusCode)
		}

		var pixResp PixabayResponse
		if err := json.NewDecoder(resp.Body).Decode(&pixResp); err != nil {
			return "", err
		}

		if len(pixResp.Hits) > 0 {

			return pixResp.Hits[0].WebformatURL, nil
		}

		return "", nil
	})

	if err != nil {
		return "", err
	}
	return result.(string), nil
}

func (s *NounProjectService) getIconifyIcon(ctx context.Context, word string) (string, error) {
	result, err := s.iconifyBreaker.Execute(func() (interface{}, error) {
		reqURL := fmt.Sprintf("%s/search?query=%s&limit=1", s.iconifyBaseURL, url.QueryEscape(word))

		req, err := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
		if err != nil {
			return "", err
		}

		req.Header.Set("Accept", "application/json")

		client := &http.Client{Timeout: 3 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return "", err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return "", fmt.Errorf("Iconify API returned status %d", resp.StatusCode)
		}

		var iconifyResp IconifyResponse
		if err := json.NewDecoder(resp.Body).Decode(&iconifyResp); err != nil {
			return "", err
		}

		if len(iconifyResp.Icons) > 0 {
			parts := strings.Split(iconifyResp.Icons[0], ":")
			if len(parts) == 2 {

				return fmt.Sprintf("%s/%s/%s.svg", s.iconifyBaseURL, parts[0], parts[1]), nil
			}
		}

		return "", nil
	})

	if err != nil {
		return "", err
	}
	return result.(string), nil
}
