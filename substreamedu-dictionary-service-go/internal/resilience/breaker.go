package resilience

import (
	"errors"
	"time"

	"github.com/sony/gobreaker"
	"go.uber.org/zap"
)

// ErrCircuitOpen is returned when the circuit breaker is in Open state.
var ErrCircuitOpen = errors.New("circuit breaker is open: service unavailable")

// BreakerConfig configures the sliding window circuit breaker.
type BreakerConfig struct {
	Name             string
	MinRequests      uint32
	FailureThreshold float64       // e.g. 0.50 (50% failure rate)
	Interval         time.Duration // Sliding window interval (e.g. 30s)
	OpenTimeout      time.Duration // Wait duration in Open state (e.g. 15s)
	HalfOpenTrials   uint32        // Consecutive successes in Half-Open to close
}

// DefaultBreakerConfig returns production defaults for external API calls.
func DefaultBreakerConfig(name string) BreakerConfig {
	return BreakerConfig{
		Name:             name,
		MinRequests:      10,
		FailureThreshold: 0.50,
		Interval:         30 * time.Second,
		OpenTimeout:      15 * time.Second,
		HalfOpenTrials:   3,
	}
}

// NewCustomCircuitBreaker creates a gobreaker instance with explicit sliding window configuration.
func NewCustomCircuitBreaker(cfg BreakerConfig, logger *zap.Logger) *gobreaker.CircuitBreaker {
	settings := gobreaker.Settings{
		Name:        cfg.Name,
		MaxRequests: cfg.HalfOpenTrials,
		Interval:    cfg.Interval,
		Timeout:     cfg.OpenTimeout,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			if counts.Requests < cfg.MinRequests {
				return false
			}
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return failureRatio >= cfg.FailureThreshold
		},
		OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
			if logger != nil {
				logger.Warn("Circuit Breaker State Transition",
					zap.String("name", name),
					zap.String("from", from.String()),
					zap.String("to", to.String()),
				)
			}
		},
	}

	return gobreaker.NewCircuitBreaker(settings)
}

// NewCircuitBreaker creates a standard circuit breaker with default settings.
func NewCircuitBreaker(name string, logger *zap.Logger) *gobreaker.CircuitBreaker {
	return NewCustomCircuitBreaker(DefaultBreakerConfig(name), logger)
}

// ExecuteWithFallback executes the operation protected by the breaker.
// If the breaker is open or the operation fails, it executes the fallback immediately.
func ExecuteWithFallback[T any](
	cb *gobreaker.CircuitBreaker,
	op func() (T, error),
	fallback func(err error) (T, error),
) (T, error) {
	var zero T
	res, err := cb.Execute(func() (interface{}, error) {
		return op()
	})

	if err != nil {
		if errors.Is(err, gobreaker.ErrOpenState) || errors.Is(err, gobreaker.ErrTooManyRequests) {
			if fallback != nil {
				return fallback(ErrCircuitOpen)
			}
			return zero, ErrCircuitOpen
		}
		if fallback != nil {
			return fallback(err)
		}
		return zero, err
	}

	return res.(T), nil
}
