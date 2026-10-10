package resilience

import (
	"context"
	"crypto/rand"
	"errors"
	"math/big"
	"net"
	"net/http"
	"syscall"
	"time"
)

// RetryConfig defines exponential backoff with full jitter parameters.
type RetryConfig struct {
	MaxAttempts     int
	InitialInterval time.Duration
	MaxInterval     time.Duration
	Multiplier      float64
	IsRetryable     func(error) bool
}

// DefaultRetryConfig provides production defaults for network operations.
func DefaultRetryConfig() RetryConfig {
	return RetryConfig{
		MaxAttempts:     3,
		InitialInterval: 100 * time.Millisecond,
		MaxInterval:     2 * time.Second,
		Multiplier:      2.0,
		IsRetryable:     IsTransientNetworkError,
	}
}

// FullJitterBackoff computes sleep duration using AWS Full Jitter:
// sleep = random_between(0, min(MaxInterval, InitialInterval * Multiplier^attempt))
func FullJitterBackoff(attempt int, cfg RetryConfig) time.Duration {
	if attempt <= 0 {
		return 0
	}
	mult := 1.0
	for i := 1; i < attempt; i++ {
		mult *= cfg.Multiplier
	}
	cappedMax := float64(cfg.InitialInterval) * mult
	if cappedMax > float64(cfg.MaxInterval) {
		cappedMax = float64(cfg.MaxInterval)
	}

	maxMillis := int64(cappedMax / float64(time.Millisecond))
	if maxMillis <= 0 {
		return 0
	}

	// Crypto rand to guarantee unbias and zero synchronization across processes
	nBig, err := rand.Int(rand.Reader, big.NewInt(maxMillis+1))
	if err != nil {
		return time.Duration(maxMillis/2) * time.Millisecond
	}
	return time.Duration(nBig.Int64()) * time.Millisecond
}

// Retry executes the operation with exponential backoff and full jitter.
func Retry(ctx context.Context, cfg RetryConfig, op func(ctx context.Context) error) error {
	if cfg.MaxAttempts <= 0 {
		cfg.MaxAttempts = 1
	}
	if cfg.IsRetryable == nil {
		cfg.IsRetryable = IsTransientNetworkError
	}

	var lastErr error
	for attempt := 1; attempt <= cfg.MaxAttempts; attempt++ {
		if err := ctx.Err(); err != nil {
			if lastErr != nil {
				return lastErr
			}
			return err
		}

		err := op(ctx)
		if err == nil {
			return nil
		}
		lastErr = err

		if attempt == cfg.MaxAttempts || !cfg.IsRetryable(err) {
			return err
		}

		sleep := FullJitterBackoff(attempt, cfg)
		timer := time.NewTimer(sleep)
		select {
		case <-ctx.Done():
			timer.Stop()
			return lastErr
		case <-timer.C:
		}
	}

	return lastErr
}

// IsTransientNetworkError identifies retryable network failures (timeouts, connection resets, 429/502/503/504).
func IsTransientNetworkError(err error) bool {
	if err == nil {
		return false
	}

	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return true
	}

	if errors.Is(err, syscall.ECONNREFUSED) ||
		errors.Is(err, syscall.ECONNRESET) ||
		errors.Is(err, syscall.EPIPE) {
		return true
	}

	var httpErr *HTTPStatusError
	if errors.As(err, &httpErr) {
		switch httpErr.StatusCode {
		case http.StatusTooManyRequests,
			http.StatusBadGateway,
			http.StatusServiceUnavailable,
			http.StatusGatewayTimeout:
			return true
		default:
			return false
		}
	}

	return false
}

// HTTPStatusError represents an HTTP status response error.
type HTTPStatusError struct {
	StatusCode int
	Message    string
}

func (e *HTTPStatusError) Error() string {
	return e.Message
}
