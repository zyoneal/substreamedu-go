package proxy

import (
	"sync"
	"time"
)

type CircuitState int

const (
	StateClosed CircuitState = iota
	StateOpen
	StateHalfOpen
)

type CircuitBreaker struct {
	mu              sync.RWMutex
	state           CircuitState
	windowSize      int
	window          []bool // circular buffer: true for success, false for failure
	windowIdx       int
	totalInWindow   int
	minRequests     int
	failureRate     float64
	timeout         time.Duration
	lastFailureTime time.Time
	halfOpenSuccess int
	halfOpenTarget  int
}

// NewCircuitBreaker creates a circuit breaker with sliding window and 50% failure rate threshold.
func NewCircuitBreaker(threshold int, timeout time.Duration) *CircuitBreaker {
	windowSize := 20
	if threshold > 10 {
		windowSize = threshold * 2
	}
	minRequests := threshold
	if minRequests < 5 {
		minRequests = 5
	}
	return &CircuitBreaker{
		state:          StateClosed,
		windowSize:     windowSize,
		window:         make([]bool, windowSize),
		minRequests:    minRequests,
		failureRate:    0.50,
		timeout:        timeout,
		halfOpenTarget: 3,
	}
}

func (cb *CircuitBreaker) State() CircuitState {
	cb.mu.RLock()
	defer cb.mu.RUnlock()
	return cb.state
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
			cb.halfOpenSuccess = 0
			return true
		}
		return false
	case StateHalfOpen:
		return true
	}
	return true
}

func (cb *CircuitBreaker) Success() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	if cb.state == StateHalfOpen {
		cb.halfOpenSuccess++
		if cb.halfOpenSuccess >= cb.halfOpenTarget {
			cb.state = StateClosed
			cb.resetWindow()
		}
		return
	}

	if cb.state == StateClosed {
		cb.record(true)
	}
}

func (cb *CircuitBreaker) Failure() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.lastFailureTime = time.Now()

	if cb.state == StateHalfOpen {
		cb.state = StateOpen
		return
	}

	if cb.state == StateClosed {
		cb.record(false)
		if cb.totalInWindow >= cb.minRequests {
			failures := 0
			for i := 0; i < cb.totalInWindow; i++ {
				if !cb.window[i] {
					failures++
				}
			}
			if float64(failures)/float64(cb.totalInWindow) >= cb.failureRate {
				cb.state = StateOpen
			}
		}
	}
}

func (cb *CircuitBreaker) record(success bool) {
	cb.window[cb.windowIdx] = success
	cb.windowIdx = (cb.windowIdx + 1) % cb.windowSize
	if cb.totalInWindow < cb.windowSize {
		cb.totalInWindow++
	}
}

func (cb *CircuitBreaker) resetWindow() {
	cb.windowIdx = 0
	cb.totalInWindow = 0
	cb.halfOpenSuccess = 0
}
