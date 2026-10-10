package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

func TestIdempotencyMiddleware_Lifecycle(t *testing.T) {
	gin.SetMode(gin.TestMode)
	logger := zap.NewNop()
	store := NewMemoryIdempotencyStore()

	executionCount := 0
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("userID", "user-123")
		c.Next()
	})
	r.Use(IdempotencyMiddleware(store, logger))
	r.POST("/test-mutate", func(c *gin.Context) {
		executionCount++
		c.JSON(http.StatusCreated, gin.H{
			"status": "success",
			"count":  executionCount,
		})
	})

	// 1. First execution with Idempotency-Key
	req1, _ := http.NewRequest("POST", "/test-mutate", strings.NewReader(`{}`))
	req1.Header.Set("Idempotency-Key", "key-abc-1")
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)

	assert.Equal(t, http.StatusCreated, w1.Code)
	assert.Equal(t, 1, executionCount)
	assert.Contains(t, w1.Body.String(), `"count":1`)

	// 2. Replay with identical Idempotency-Key -> returns cached result, handler not called again
	req2, _ := http.NewRequest("POST", "/test-mutate", strings.NewReader(`{}`))
	req2.Header.Set("Idempotency-Key", "key-abc-1")
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)

	assert.Equal(t, http.StatusCreated, w2.Code)
	assert.Equal(t, 1, executionCount, "Handler must NOT be executed a second time")
	assert.Contains(t, w2.Body.String(), `"count":1`)
	assert.Equal(t, "HIT-IDEMPOTENT", w2.Header().Get("X-Cache-Lookup"))

	// 3. Different Idempotency-Key executes handler normally
	req3, _ := http.NewRequest("POST", "/test-mutate", strings.NewReader(`{}`))
	req3.Header.Set("Idempotency-Key", "key-abc-2")
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, req3)

	assert.Equal(t, http.StatusCreated, w3.Code)
	assert.Equal(t, 2, executionCount)
	assert.Contains(t, w3.Body.String(), `"count":2`)
}

func TestIdempotencyMiddleware_ConcurrentProcessing_ReturnsConflict(t *testing.T) {
	gin.SetMode(gin.TestMode)
	logger := zap.NewNop()
	store := NewMemoryIdempotencyStore()

	// Simulate in-flight request
	_ = store.Set(nil, "idempotency:user-123:key-locked", "PROCESSING", 60*time.Second)

	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("userID", "user-123")
		c.Next()
	})
	r.Use(IdempotencyMiddleware(store, logger))
	r.POST("/test-mutate", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("POST", "/test-mutate", nil)
	req.Header.Set("Idempotency-Key", "key-locked")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Contains(t, w.Body.String(), "currently in progress")
}

func TestIdempotencyMiddleware_FailedRequest_AllowsRetry(t *testing.T) {
	gin.SetMode(gin.TestMode)
	logger := zap.NewNop()
	store := NewMemoryIdempotencyStore()

	shouldFail := true
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("userID", "user-123")
		c.Next()
	})
	r.Use(IdempotencyMiddleware(store, logger))
	r.POST("/test-mutate", func(c *gin.Context) {
		if shouldFail {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"status": "created"})
	})

	// 1. Initial attempt fails with 400
	req1, _ := http.NewRequest("POST", "/test-mutate", nil)
	req1.Header.Set("Idempotency-Key", "retry-key")
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)
	assert.Equal(t, http.StatusBadRequest, w1.Code)

	// 2. Subsequent attempt succeeds because failed key was evicted
	shouldFail = false
	req2, _ := http.NewRequest("POST", "/test-mutate", nil)
	req2.Header.Set("Idempotency-Key", "retry-key")
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusCreated, w2.Code)
}
