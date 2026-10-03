// Package cache provides in-memory caching with TTL support.
package cache

import (
	"sync"
	"time"

	gocache "github.com/patrickmn/go-cache"
)

// OTPItem represents a cached OTP with metadata.
type OTPItem struct {
	Code      string
	Attempts  int
	CreatedAt time.Time
	Blocked   bool
}

// OTPCache manages OTP codes with automatic expiration and rate limiting.
// Thread-safe wrapper around go-cache.
type OTPCache struct {
	cache *gocache.Cache
	mu    sync.RWMutex
}

// NewOTPCache creates a new OTP cache with 5 minute expiration.
func NewOTPCache() *OTPCache {
	// 5 minutes expiration, cleanup every 10 minutes
	return &OTPCache{
		cache: gocache.New(5*time.Minute, 10*time.Minute),
	}
}

// Set stores an OTP code for the given email.
func (c *OTPCache) Set(email, otp string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.cache.Set(email, &OTPItem{
		Code:      otp,
		Attempts:  0,
		CreatedAt: time.Now(),
		Blocked:   false,
	}, gocache.DefaultExpiration)
}

// Get retrieves an OTP item for the given email.
func (c *OTPCache) Get(email string) *OTPItem {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if value, found := c.cache.Get(email); found {
		return value.(*OTPItem)
	}
	return nil
}

// Delete removes an OTP code for the given email.
func (c *OTPCache) Delete(email string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.cache.Delete(email)
}

// IncrementAttempts increments the attempt counter for an OTP.
// Returns the new attempt count.
func (c *OTPCache) IncrementAttempts(email string) int {
	c.mu.Lock()
	defer c.mu.Unlock()

	if value, found := c.cache.Get(email); found {
		item := value.(*OTPItem)
		item.Attempts++
		// If too many attempts (e.g., > 3), block it.
		// Note: Logic for what to do with the count is in service,
		// but we can also set a flag here if we want strict enforcement.
		c.cache.Set(email, item, gocache.DefaultExpiration)
		return item.Attempts
	}
	return 0
}
