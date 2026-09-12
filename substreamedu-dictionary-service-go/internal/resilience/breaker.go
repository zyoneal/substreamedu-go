package resilience

import (
	"time"

	"github.com/sony/gobreaker"
	"go.uber.org/zap"
)

func NewCircuitBreaker(name string, logger *zap.Logger) *gobreaker.CircuitBreaker {
	settings := gobreaker.Settings{
		Name:		name,
		MaxRequests:	5,
		Interval:	60 * time.Second,
		Timeout:	30 * time.Second,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= 10 && failureRatio >= 0.6
		},
		OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
			logger.Warn("Circuit Breaker State Changed",
				zap.String("name", name),
				zap.String("from", from.String()),
				zap.String("to", to.String()),
			)
		},
	}

	return gobreaker.NewCircuitBreaker(settings)
}
