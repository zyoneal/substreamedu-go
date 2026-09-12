package proxy

import (
	"sync"
	"time"
)

type CircuitState int

const (
	StateClosed	CircuitState	= iota
	StateOpen
	StateHalfOpen
)

type CircuitBreaker struct {
	mu		sync.RWMutex
	state		CircuitState
	failures	int
	threshold	int
	timeout		time.Duration
	lastFailureTime	time.Time
	halfOpenMax	int
	halfOpenCount	int
}

func NewCircuitBreaker(threshold int, timeout time.Duration) *CircuitBreaker {
	return &CircuitBreaker{
		state:		StateClosed,
		threshold:	threshold,
		timeout:	timeout,
	}
}

func (cb *CircuitBreaker) Allow() bool {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	switch cb.state {
	case StateClosed:
		return true
	case StateOpen:
		if time.Since(cb.lastFailureTime) > cb.timeout {
			cb.state = StateHalfOpen
			cb.halfOpenCount = 0
			return true
		}
		return false
	case StateHalfOpen:
		if cb.halfOpenCount < 1 {
			cb.halfOpenCount++
			return true
		}
		return false
	}
	return true
}

func (cb *CircuitBreaker) Success() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.failures = 0
	if cb.state == StateHalfOpen {
		cb.state = StateClosed
		cb.halfOpenCount = 0
	}
}

func (cb *CircuitBreaker) Failure() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.failures++
	cb.lastFailureTime = time.Now()

	if cb.failures >= cb.threshold {
		cb.state = StateOpen
	}
}
