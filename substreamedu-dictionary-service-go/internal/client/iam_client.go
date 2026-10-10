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
	"github.com/sony/gobreaker"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/resilience"
	"go.uber.org/zap"
)

type UsageInfo struct {
	IsPremium        bool
	TranslationCount int
	SavedWordsCount  int
}

type usageCacheEntry struct {
	info      UsageInfo
	expiresAt time.Time
}

type IAMClient struct {
	baseURL            string
	internalServiceKey string
	httpClient         *http.Client
	breaker            *gobreaker.CircuitBreaker
	cache              map[string]*usageCacheEntry
	mu                 sync.RWMutex
	cacheTTL           time.Duration
	logger             *zap.Logger
}

func NewIAMClient(baseURL string, internalServiceKey string, logger *zap.Logger) *IAMClient {
	return &IAMClient{
		baseURL:            baseURL,
		internalServiceKey: internalServiceKey,
		httpClient: resilience.NewResilientClient(resilience.DefaultClientOptions(1500 * time.Millisecond)),
		breaker:    resilience.NewCircuitBreaker("iam-client", logger),
		cache:      make(map[string]*usageCacheEntry),
		cacheTTL:   60 * time.Second,
		logger:     logger,
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
		c.mu.RLock()
		if staleEntry, hasStale := c.cache[key]; hasStale {
			c.mu.RUnlock()
			c.logger.Warn("IAM fetch failed, returning stale usage cache", zap.Error(err))
			return &staleEntry.info, nil
		}
		c.mu.RUnlock()
		return nil, err
	}

	if info != nil {
		c.mu.Lock()
		c.cache[key] = &usageCacheEntry{
			info:      *info,
			expiresAt: time.Now().Add(c.cacheTTL),
		}
		c.mu.Unlock()
	}

	return info, nil
}

func (c *IAMClient) fetchUsage(ctx context.Context, userID uuid.UUID) (*UsageInfo, error) {
	url := fmt.Sprintf("%s/auth-service/auth/internal/user/%s/usage", c.baseURL, userID.String())

	val, err := c.breaker.Execute(func() (interface{}, error) {
		var apiResp struct {
			Success bool      `json:"success"`
			Data    UsageInfo `json:"data"`
		}

		retryCfg := resilience.RetryConfig{
			MaxAttempts:     3,
			InitialInterval: 50 * time.Millisecond,
			MaxInterval:     500 * time.Millisecond,
			Multiplier:      2.0,
			IsRetryable:     resilience.IsTransientNetworkError,
		}

		err := resilience.Retry(ctx, retryCfg, func(reqCtx context.Context) error {
			req, reqErr := http.NewRequestWithContext(reqCtx, http.MethodGet, url, nil)
			if reqErr != nil {
				return reqErr
			}
			if c.internalServiceKey != "" {
				req.Header.Set("X-Internal-Service-Key", c.internalServiceKey)
			}

			resp, doErr := c.httpClient.Do(req)
			if doErr != nil {
				return doErr
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				return &resilience.HTTPStatusError{
					StatusCode: resp.StatusCode,
					Message:    fmt.Sprintf("IAM returned status %d", resp.StatusCode),
				}
			}

			if decodeErr := json.NewDecoder(resp.Body).Decode(&apiResp); decodeErr != nil {
				return fmt.Errorf("decode response: %w", decodeErr)
			}
			if !apiResp.Success {
				return fmt.Errorf("IAM returned unsuccessful response")
			}
			return nil
		})

		if err != nil {
			return nil, err
		}
		return &apiResp.Data, nil
	})

	if err != nil {
		return nil, err
	}
	return val.(*UsageInfo), nil
}

func (c *IAMClient) InvalidateCache(userID uuid.UUID) {
	key := userID.String()
	c.mu.Lock()
	delete(c.cache, key)
	c.mu.Unlock()
}

func (c *IAMClient) IncrementUsage(ctx context.Context, userID uuid.UUID, usageType string, idempotencyKey ...string) error {
	url := fmt.Sprintf("%s/auth-service/auth/internal/user/%s/usage/increment", c.baseURL, userID.String())

	body := map[string]string{"type": usageType}
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshal body: %w", err)
	}

	_, err = c.breaker.Execute(func() (interface{}, error) {
		retryCfg := resilience.RetryConfig{
			MaxAttempts:     3,
			InitialInterval: 50 * time.Millisecond,
			MaxInterval:     500 * time.Millisecond,
			Multiplier:      2.0,
			IsRetryable:     resilience.IsTransientNetworkError,
		}

		return nil, resilience.Retry(ctx, retryCfg, func(reqCtx context.Context) error {
			req, reqErr := http.NewRequestWithContext(reqCtx, http.MethodPost, url, bytes.NewBuffer(jsonBody))
			if reqErr != nil {
				return reqErr
			}
			req.Header.Set("Content-Type", "application/json")
			if c.internalServiceKey != "" {
				req.Header.Set("X-Internal-Service-Key", c.internalServiceKey)
			}
			if len(idempotencyKey) > 0 && idempotencyKey[0] != "" {
				req.Header.Set("Idempotency-Key", idempotencyKey[0])
			}

			resp, doErr := c.httpClient.Do(req)
			if doErr != nil {
				return doErr
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				return &resilience.HTTPStatusError{
					StatusCode: resp.StatusCode,
					Message:    fmt.Sprintf("IAM returned status %d", resp.StatusCode),
				}
			}
			return nil
		})
	})

	if err != nil {
		return fmt.Errorf("increment usage: %w", err)
	}

	c.InvalidateCache(userID)
	return nil
}
