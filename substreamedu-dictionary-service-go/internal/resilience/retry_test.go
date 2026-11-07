package resilience

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestFullJitterBackoff_Boundaries(t *testing.T) {
	cfg := RetryConfig{
		InitialInterval: 50 * time.Millisecond,
		MaxInterval:     200 * time.Millisecond,
		Multiplier:      2.0,
	}

	for attempt := 1; attempt <= 10; attempt++ {
		sleep := FullJitterBackoff(attempt, cfg)
		assert.True(t, sleep >= 0, "sleep duration must be non-negative")
		assert.True(t, sleep <= cfg.MaxInterval, "sleep duration must not exceed MaxInterval")
	}
}

func TestRetry_SuccessOnFirstAttempt(t *testing.T) {
	ctx := context.Background()
	calls := 0
	err := Retry(ctx, DefaultRetryConfig(), func(ctx context.Context) error {
		calls++
		return nil
	})

	assert.NoError(t, err)
	assert.Equal(t, 1, calls)
}

func TestRetry_SuccessAfterRetries(t *testing.T) {
	ctx := context.Background()
	calls := 0
	cfg := RetryConfig{
		MaxAttempts:     3,
		InitialInterval: 5 * time.Millisecond,
		MaxInterval:     20 * time.Millisecond,
		Multiplier:      2.0,
		IsRetryable: func(err error) bool {
			return true
		},
	}

	err := Retry(ctx, cfg, func(ctx context.Context) error {
		calls++
		if calls < 3 {
			return errors.New("transient error")
		}
		return nil
	})

	assert.NoError(t, err)
	assert.Equal(t, 3, calls)
}

func TestRetry_NonRetryableError_AbortsImmediately(t *testing.T) {
	ctx := context.Background()
	calls := 0
	cfg := DefaultRetryConfig()

	err := Retry(ctx, cfg, func(ctx context.Context) error {
		calls++
		return &HTTPStatusError{StatusCode: http.StatusBadRequest, Message: "Bad Request"}
	})

	assert.Error(t, err)
	assert.Equal(t, 1, calls, "Non-retryable error should not trigger retries")
}

func TestRetry_ContextCancellation_TerminatesEarly(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cfg := RetryConfig{
		MaxAttempts:     5,
		InitialInterval: 50 * time.Millisecond,
		MaxInterval:     100 * time.Millisecond,
		Multiplier:      2.0,
		IsRetryable:     func(err error) bool { return true },
	}

	calls := 0
	go func() {
		time.Sleep(10 * time.Millisecond)
		cancel()
	}()

	err := Retry(ctx, cfg, func(ctx context.Context) error {
		calls++
		return errors.New("temporary error")
	})

	assert.Error(t, err)
}
