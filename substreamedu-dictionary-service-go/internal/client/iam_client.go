package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

type UsageInfo struct {
	IsPremium		bool
	TranslationCount	int
	SavedWordsCount		int
}

type usageCacheEntry struct {
	info		UsageInfo
	expiresAt	time.Time
}

type IAMClient struct {
	baseURL		string
	httpClient	*http.Client
	cache		map[string]*usageCacheEntry
	mu		sync.RWMutex
	cacheTTL	time.Duration
	logger		*zap.Logger
}

func NewIAMClient(baseURL string, logger *zap.Logger) *IAMClient {
	return &IAMClient{
		baseURL:	baseURL,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
		cache:		make(map[string]*usageCacheEntry),
		cacheTTL:	60 * time.Second,
		logger:		logger,
	}
}

func (c *IAMClient) GetUsage(ctx context.Context, userID uuid.UUID) (*UsageInfo, error) {
	key := userID.String()

	c.mu.RLock()
	entry, ok := c.cache[key]
	if ok && time.Now().Before(entry.expiresAt) {
		c.mu.RUnlock()
		return &entry.info, nil
	}
	c.mu.RUnlock()

	info, err := c.fetchUsage(ctx, userID)
	if err != nil {
		return nil, err
	}

	if info != nil {
		c.mu.Lock()
		c.cache[key] = &usageCacheEntry{
			info:		*info,
			expiresAt:	time.Now().Add(c.cacheTTL),
		}
		c.mu.Unlock()
	}

	return info, nil
}

func (c *IAMClient) fetchUsage(ctx context.Context, userID uuid.UUID) (*UsageInfo, error) {
	url := fmt.Sprintf("%s/auth-service/auth/internal/user/%s/usage", c.baseURL, userID.String())

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get usage: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("IAM returned status %d", resp.StatusCode)
	}

	var apiResp struct {
		Success	bool		`json:"success"`
		Data	UsageInfo	`json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	if !apiResp.Success {
		return nil, fmt.Errorf("IAM returned unsuccessful response")
	}

	return &apiResp.Data, nil
}

func (c *IAMClient) InvalidateCache(userID uuid.UUID) {
	key := userID.String()
	c.mu.Lock()
	delete(c.cache, key)
	c.mu.Unlock()
}

func (c *IAMClient) IncrementUsage(ctx context.Context, userID uuid.UUID, usageType string) error {
	url := fmt.Sprintf("%s/auth-service/auth/internal/user/%s/usage/increment", c.baseURL, userID.String())

	body := map[string]string{"type": usageType}
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshal body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("increment usage: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("IAM returned status %d", resp.StatusCode)
	}

	c.InvalidateCache(userID)
	return nil
}
