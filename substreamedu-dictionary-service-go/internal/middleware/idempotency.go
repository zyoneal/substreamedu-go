package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// IdempotencyStore abstracts the underlying key-value storage (Redis or In-Memory).
type IdempotencyStore interface {
	SetNX(ctx context.Context, key string, value string, ttl time.Duration) (bool, error)
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value string, ttl time.Duration) error
	Del(ctx context.Context, key string) error
}

type memoryEntry struct {
	value     string
	expiresAt time.Time
}

// MemoryIdempotencyStore provides an in-memory implementation for testing or fallback.
type MemoryIdempotencyStore struct {
	mu      sync.RWMutex
	entries map[string]memoryEntry
}

func NewMemoryIdempotencyStore() *MemoryIdempotencyStore {
	return &MemoryIdempotencyStore{entries: make(map[string]memoryEntry)}
}

func (s *MemoryIdempotencyStore) SetNX(ctx context.Context, key string, value string, ttl time.Duration) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	if entry, exists := s.entries[key]; exists && now.Before(entry.expiresAt) {
		return false, nil
	}

	s.entries[key] = memoryEntry{value: value, expiresAt: now.Add(ttl)}
	return true, nil
}

func (s *MemoryIdempotencyStore) Get(ctx context.Context, key string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	entry, exists := s.entries[key]
	if !exists || time.Now().After(entry.expiresAt) {
		return "", fmt.Errorf("key not found")
	}
	return entry.value, nil
}

func (s *MemoryIdempotencyStore) Set(ctx context.Context, key string, value string, ttl time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.entries[key] = memoryEntry{value: value, expiresAt: time.Now().Add(ttl)}
	return nil
}

func (s *MemoryIdempotencyStore) Del(ctx context.Context, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.entries, key)
	return nil
}

// RedisIdempotencyStore implements IdempotencyStore over Redis.
type RedisIdempotencyStore struct {
	rdb *redis.Client
}

func NewRedisIdempotencyStore(rdb *redis.Client) *RedisIdempotencyStore {
	return &RedisIdempotencyStore{rdb: rdb}
}

func (s *RedisIdempotencyStore) SetNX(ctx context.Context, key string, value string, ttl time.Duration) (bool, error) {
	return s.rdb.SetNX(ctx, key, value, ttl).Result()
}

func (s *RedisIdempotencyStore) Get(ctx context.Context, key string) (string, error) {
	return s.rdb.Get(ctx, key).Result()
}

func (s *RedisIdempotencyStore) Set(ctx context.Context, key string, value string, ttl time.Duration) error {
	return s.rdb.Set(ctx, key, value, ttl).Err()
}

func (s *RedisIdempotencyStore) Del(ctx context.Context, key string) error {
	return s.rdb.Del(ctx, key).Err()
}

type cachedResponse struct {
	StatusCode int               `json:"status_code"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
}

type responseBodyWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w responseBodyWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

// IdempotencyMiddleware ensures that mutating HTTP calls with an Idempotency-Key
// are deduplicated across a 24-hour window using atomic store operations.
func IdempotencyMiddleware(store IdempotencyStore, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		idempotencyKey := strings.TrimSpace(c.GetHeader("Idempotency-Key"))
		if idempotencyKey == "" {
			idempotencyKey = strings.TrimSpace(c.GetHeader("X-Idempotency-Key"))
		}

		if idempotencyKey == "" || store == nil {
			c.Next()
			return
		}

		if len(idempotencyKey) > 128 {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Idempotency-Key exceeds maximum length of 128 characters",
			})
			return
		}

		userID := "anonymous"
		if uid, exists := c.Get("userID"); exists {
			userID = fmt.Sprintf("%v", uid)
		}

		storeKey := fmt.Sprintf("idempotency:%s:%s", userID, idempotencyKey)
		ctx := c.Request.Context()

		locked, err := store.SetNX(ctx, storeKey, "PROCESSING", 2*time.Minute)
		if err != nil {
			if logger != nil {
				logger.Warn("Failed to set idempotency lock, passing through", zap.Error(err))
			}
			c.Next()
			return
		}

		if !locked {
			val, getErr := store.Get(ctx, storeKey)
			if getErr != nil {
				c.Next()
				return
			}

			if val == "PROCESSING" {
				c.AbortWithStatusJSON(http.StatusConflict, gin.H{
					"status":  "error",
					"message": "A request with the same Idempotency-Key is currently in progress",
				})
				return
			}

			var cached cachedResponse
			if err := json.Unmarshal([]byte(val), &cached); err == nil {
				for hKey, hVal := range cached.Headers {
					c.Writer.Header().Set(hKey, hVal)
				}
				c.Writer.Header().Set("X-Cache-Lookup", "HIT-IDEMPOTENT")
				c.Data(cached.StatusCode, c.Writer.Header().Get("Content-Type"), []byte(cached.Body))
				c.Abort()
				return
			}
		}

		bodyWriter := &responseBodyWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = bodyWriter

		c.Next()

		statusCode := c.Writer.Status()
		if statusCode >= 200 && statusCode < 300 {
			cached := cachedResponse{
				StatusCode: statusCode,
				Headers: map[string]string{
					"Content-Type": c.Writer.Header().Get("Content-Type"),
				},
				Body: bodyWriter.body.String(),
			}
			if encoded, jsonErr := json.Marshal(cached); jsonErr == nil {
				_ = store.Set(context.Background(), storeKey, string(encoded), 24*time.Hour)
			}
		} else {
			_ = store.Del(context.Background(), storeKey)
		}
	}
}
