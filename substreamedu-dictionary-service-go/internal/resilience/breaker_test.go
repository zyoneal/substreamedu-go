package resilience

import (
	"errors"
	"testing"
	"time"

	"github.com/sony/gobreaker"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

func TestCircuitBreaker_StateTransitionsAndFallback(t *testing.T) {
	logger := zap.NewNop()
	cfg := BreakerConfig{
		Name:             "test-breaker",
		MinRequests:      4,
		FailureThreshold: 0.50, // 50%
		Interval:         1 * time.Second,
		OpenTimeout:      50 * time.Millisecond, // Fast cooldown for test
		HalfOpenTrials:   2,
	}

	cb := NewCustomCircuitBreaker(cfg, logger)
	assert.Equal(t, gobreaker.StateClosed, cb.State())

	// 1. Initial successful calls
	val, err := ExecuteWithFallback(cb, func() (string, error) {
		return "ok", nil
	}, nil)
	assert.NoError(t, err)
	assert.Equal(t, "ok", val)

	// 2. Generate 4 failures to trip the circuit (4 failures out of 5 total > 50%)
	for i := 0; i < 4; i++ {
		_, _ = ExecuteWithFallback(cb, func() (string, error) {
			return "", errors.New("downstream error")
		}, nil)
	}

	// 3. Circuit breaker should now be OPEN
	assert.Equal(t, gobreaker.StateOpen, cb.State())

	// 4. In OPEN state, fallback must be triggered immediately without calling op
	opCalled := false
	fallbackCalled := false
	valFallback, err := ExecuteWithFallback(cb, func() (string, error) {
		opCalled = true
		return "op_result", nil
	}, func(err error) (string, error) {
		fallbackCalled = true
		return "fallback_result", nil
	})

	assert.False(t, opCalled, "Operation must NOT be called when circuit is open")
	assert.True(t, fallbackCalled, "Fallback must be called when circuit is open")
	assert.NoError(t, err)
	assert.Equal(t, "fallback_result", valFallback)

	// 5. Wait for OpenTimeout cooldown to allow Half-Open state
	time.Sleep(70 * time.Millisecond)

	// 6. Half-Open trial 1 (success)
	valTrial1, err := ExecuteWithFallback(cb, func() (string, error) {
		return "half_open_1", nil
	}, nil)
	assert.NoError(t, err)
	assert.Equal(t, "half_open_1", valTrial1)
	assert.Equal(t, gobreaker.StateHalfOpen, cb.State())

	// 7. Half-Open trial 2 (success) -> trips back to CLOSED
	valTrial2, err := ExecuteWithFallback(cb, func() (string, error) {
		return "half_open_2", nil
	}, nil)
	assert.NoError(t, err)
	assert.Equal(t, "half_open_2", valTrial2)
	assert.Equal(t, gobreaker.StateClosed, cb.State(), "After 2 successes in half-open, breaker must close")
}
