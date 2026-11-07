package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-notification-service/internal/config"
	"github.com/substreamedu/substreamedu-notification-service/internal/dto"
	"go.uber.org/zap"
)

type IAMClient struct {
	baseURL            string
	internalServiceKey string
	httpClient         *http.Client
	logger             *zap.Logger
}

func NewIAMClient(cfg *config.ServicesConfig, logger *zap.Logger) *IAMClient {
	return &IAMClient{
		baseURL:            cfg.IAMURL,
		internalServiceKey: cfg.InternalServiceKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		logger: logger,
	}
}

func (c *IAMClient) GetUserByTelegramToken(ctx context.Context, token string) (*dto.UserResponse, error) {
	url := fmt.Sprintf("%s/auth/internal/user/by-telegram-token/%s", c.baseURL, token)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	if c.internalServiceKey != "" {
		req.Header.Set("X-Internal-Service-Key", c.internalServiceKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	var apiResp dto.ApiResponse[dto.UserResponse]
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("unmarshal: %w", err)
	}

	if apiResp.Status != "success" && !apiResp.Success {
		return nil, fmt.Errorf("api error: %s", apiResp.Message)
	}

	return &apiResp.Data, nil
}

type DictionaryClient struct {
	baseURL            string
	internalServiceKey string
	httpClient         *http.Client
	logger             *zap.Logger
}

func NewDictionaryClient(cfg *config.ServicesConfig, logger *zap.Logger) *DictionaryClient {
	return &DictionaryClient{
		baseURL:            cfg.DictionaryURL,
		internalServiceKey: cfg.InternalServiceKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		logger: logger,
	}
}

func (c *DictionaryClient) GetRandomWord(ctx context.Context, userID uuid.UUID) (*dto.DictionaryItemResponse, error) {
	url := fmt.Sprintf("%s/dictionary/random", c.baseURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("X-User-Id", userID.String())
	if c.internalServiceKey != "" {
		req.Header.Set("X-Internal-Service-Key", c.internalServiceKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	var apiResp dto.ApiResponse[dto.DictionaryItemResponse]
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("unmarshal: %w", err)
	}

	if apiResp.Status != "success" && !apiResp.Success {
		return nil, fmt.Errorf("api error: %s", apiResp.Message)
	}

	return &apiResp.Data, nil
}

func (c *DictionaryClient) GetSrsCardsForToday(ctx context.Context, userID uuid.UUID) ([]dto.DictionaryItemResponse, error) {
	url := fmt.Sprintf("%s/dictionary/srs/today", c.baseURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("X-User-Id", userID.String())
	if c.internalServiceKey != "" {
		req.Header.Set("X-Internal-Service-Key", c.internalServiceKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	var apiResp dto.ApiResponse[dto.DailySessionResponse]
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("unmarshal: %w", err)
	}

	if apiResp.Status != "success" && !apiResp.Success {
		return nil, fmt.Errorf("api error: %s", apiResp.Message)
	}

	return apiResp.Data.Cards, nil
}

func (c *DictionaryClient) ReviewCard(ctx context.Context, userID uuid.UUID, cardID int64, rating string, durationMs int) (*dto.ReviewResponse, error) {
	url := fmt.Sprintf("%s/dictionary/item/%d/review2", c.baseURL, cardID)
	reqBody := dto.ReviewRequest{
		Rating:		rating,
		ResponseTimeMs:	durationMs,
	}

	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Id", userID.String())
	if c.internalServiceKey != "" {
		req.Header.Set("X-Internal-Service-Key", c.internalServiceKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	var apiResp dto.ApiResponse[dto.ReviewResponse]
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return nil, fmt.Errorf("unmarshal: %w", err)
	}

	if apiResp.Status != "success" && !apiResp.Success {
		return nil, fmt.Errorf("api error: %s", apiResp.Message)
	}

	return &apiResp.Data, nil
}

func (c *DictionaryClient) GetDictionaryStats(ctx context.Context, userID uuid.UUID) (*dto.DictionaryStatsResponse, error) {
	url := fmt.Sprintf("%s/dictionary/srs/stats", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("X-User-Id", userID.String())
	if c.internalServiceKey != "" {
		req.Header.Set("X-Internal-Service-Key", c.internalServiceKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	var apiResp dto.ApiResponse[dto.DictionaryStatsResponse]
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("unmarshal: %w", err)
	}

	if apiResp.Status != "success" && !apiResp.Success {
		return nil, fmt.Errorf("api error: %s", apiResp.Message)
	}

	return &apiResp.Data, nil
}

func (c *DictionaryClient) GetStreak(ctx context.Context, userID uuid.UUID) (int, error) {
	url := fmt.Sprintf("%s/dictionary/streak", c.baseURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return 0, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("X-User-Id", userID.String())
	if c.internalServiceKey != "" {
		req.Header.Set("X-Internal-Service-Key", c.internalServiceKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("read body: %w", err)
	}

	var apiResp dto.ApiResponse[int]
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return 0, fmt.Errorf("unmarshal: %w", err)
	}

	return apiResp.Data, nil
}
