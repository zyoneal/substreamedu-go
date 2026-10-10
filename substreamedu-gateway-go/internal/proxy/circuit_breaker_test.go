package proxy

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestGatewayCircuitBreaker_Lifecycle(t *testing.T) {
	cb := NewCircuitBreaker(5, 50*time.Millisecond)
	assert.Equal(t, StateClosed, cb.State())
	assert.True(t, cb.Allow())

	// 1. Successes in closed state
	cb.Success()
	cb.Success()
	assert.Equal(t, StateClosed, cb.State())

	// 2. Trigger failures past 50% threshold (4 failures out of 6 calls = 66% >= 50%)
	cb.Failure()
	cb.Failure()
	cb.Failure()
	cb.Failure()

	assert.Equal(t, StateOpen, cb.State())
	assert.False(t, cb.Allow(), "Allow must return false when CircuitBreaker is Open")

	// 3. Wait for cooldown
	time.Sleep(60 * time.Millisecond)

	// 4. State transitions to Half-Open on Allow()
	assert.True(t, cb.Allow())
	assert.Equal(t, StateHalfOpen, cb.State())

	// 5. Half-open trials: 3 consecutive successes close the circuit
	cb.Success()
	assert.Equal(t, StateHalfOpen, cb.State())
	cb.Success()
	assert.Equal(t, StateHalfOpen, cb.State())
	cb.Success()
	assert.Equal(t, StateClosed, cb.State())
	assert.True(t, cb.Allow())
}

func TestGatewayCircuitBreaker_HalfOpenFailure_TripsImmediately(t *testing.T) {
	cb := NewCircuitBreaker(5, 30*time.Millisecond)

	for i := 0; i < 5; i++ {
		cb.Failure()
	}
	assert.Equal(t, StateOpen, cb.State())

	time.Sleep(35 * time.Millisecond)
	assert.True(t, cb.Allow())
	assert.Equal(t, StateHalfOpen, cb.State())

	// Single failure in Half-Open immediately trips back to Open
	cb.Failure()
	assert.Equal(t, StateOpen, cb.State())
	assert.False(t, cb.Allow())
}
