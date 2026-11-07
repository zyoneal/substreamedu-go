package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-iam-service/internal/config"
	"github.com/substreamedu/substreamedu-iam-service/internal/model"
	"github.com/substreamedu/substreamedu-iam-service/internal/service"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestInternalServiceKeyAuth(t *testing.T) {
	secretKey := "super-secret-internal-service-key-32-chars"

	router := gin.New()
	router.Use(InternalServiceKeyAuth(secretKey))
	router.GET("/internal/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Test case 1: Missing header
	req1, _ := http.NewRequest(http.MethodGet, "/internal/test", nil)
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)
	if w1.Code != http.StatusForbidden {
		t.Errorf("expected 403 Forbidden for missing key, got %d", w1.Code)
	}

	// Test case 2: Invalid header
	req2, _ := http.NewRequest(http.MethodGet, "/internal/test", nil)
	req2.Header.Set("X-Internal-Service-Key", "wrong-key")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	if w2.Code != http.StatusForbidden {
		t.Errorf("expected 403 Forbidden for wrong key, got %d", w2.Code)
	}

	// Test case 3: Valid header
	req3, _ := http.NewRequest(http.MethodGet, "/internal/test", nil)
	req3.Header.Set("X-Internal-Service-Key", secretKey)
	w3 := httptest.NewRecorder()
	router.ServeHTTP(w3, req3)
	if w3.Code != http.StatusOK {
		t.Errorf("expected 200 OK for valid key, got %d", w3.Code)
	}
}

func TestRequestIDMiddleware(t *testing.T) {
	router := gin.New()
	router.Use(RequestID())
	router.GET("/test-id", func(c *gin.Context) {
		reqID, _ := c.Get("RequestID")
		c.String(http.StatusOK, reqID.(string))
	})

	// Case 1: Empty header -> UUID generated
	req1, _ := http.NewRequest(http.MethodGet, "/test-id", nil)
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)
	generatedID := w1.Body.String()
	if _, err := uuid.Parse(generatedID); err != nil {
		t.Errorf("expected generated RequestID to be valid UUID, got %s", generatedID)
	}

	// Case 2: Custom header provided -> preserved
	req2, _ := http.NewRequest(http.MethodGet, "/test-id", nil)
	req2.Header.Set("X-Request-ID", "custom-trace-id-123")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	if w2.Body.String() != "custom-trace-id-123" {
		t.Errorf("expected custom RequestID to be preserved, got %s", w2.Body.String())
	}
}

func TestAuthMiddlewareBearerPrefix(t *testing.T) {
	cfg := &config.JWTConfig{
		SecretKey:  "this-is-a-valid-secret-key-at-least-32-chars-long",
		Expiration: time.Hour,
	}
	jwtSvc := service.NewJWTService(cfg)
	user := model.NewUser("test@example.com")
	token, _ := jwtSvc.GenerateToken(user)

	router := gin.New()
	router.Use(AuthMiddleware(jwtSvc))
	router.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Missing header
	req1, _ := http.NewRequest(http.MethodGet, "/protected", nil)
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)
	if w1.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for missing auth header, got %d", w1.Code)
	}

	// Non-bearer header
	req2, _ := http.NewRequest(http.MethodGet, "/protected", nil)
	req2.Header.Set("Authorization", "Basic "+token)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	if w2.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for Basic prefix, got %d", w2.Code)
	}

	// Valid Bearer header
	req3, _ := http.NewRequest(http.MethodGet, "/protected", nil)
	req3.Header.Set("Authorization", "Bearer "+token)
	w3 := httptest.NewRecorder()
	router.ServeHTTP(w3, req3)
	if w3.Code != http.StatusOK {
		t.Errorf("expected 200 for valid Bearer token, got %d", w3.Code)
	}
}
