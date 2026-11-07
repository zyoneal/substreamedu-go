package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/substreamedu/substreamedu-media-service/internal/middleware"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func generateTestToken(secret, userID, role string, expired bool) string {
	exp := time.Now().Add(time.Hour)
	if expired {
		exp = time.Now().Add(-time.Hour)
	}
	claims := &middleware.Claims{
		ID:   userID,
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(exp),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString([]byte(secret))
	return tokenString
}

func TestAuthMiddleware(t *testing.T) {
	secret := "media-service-test-secret-123456"

	t.Run("missing authorization header", func(t *testing.T) {
		r := gin.New()
		r.Use(middleware.AuthMiddleware(secret))
		r.GET("/protected", func(c *gin.Context) {
			c.Status(http.StatusOK)
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/protected", nil)
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("invalid token", func(t *testing.T) {
		r := gin.New()
		r.Use(middleware.AuthMiddleware(secret))
		r.GET("/protected", func(c *gin.Context) {
			c.Status(http.StatusOK)
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/protected", nil)
		req.Header.Set("Authorization", "Bearer invalid-token")
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("expired token", func(t *testing.T) {
		uid := uuid.New().String()
		token := generateTestToken(secret, uid, "USER", true)

		r := gin.New()
		r.Use(middleware.AuthMiddleware(secret))
		r.GET("/protected", func(c *gin.Context) {
			c.Status(http.StatusOK)
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("valid token extracts user id", func(t *testing.T) {
		expectedUID := uuid.New()
		token := generateTestToken(secret, expectedUID.String(), "USER", false)

		r := gin.New()
		r.Use(middleware.AuthMiddleware(secret))
		var capturedUID uuid.UUID
		r.GET("/protected", func(c *gin.Context) {
			val, _ := c.Get("userID")
			capturedUID = val.(uuid.UUID)
			c.Status(http.StatusOK)
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, expectedUID, capturedUID)
	})
}

func TestOptionalAuthMiddleware(t *testing.T) {
	secret := "media-service-test-secret-123456"

	t.Run("no header allows request through without user id", func(t *testing.T) {
		r := gin.New()
		r.Use(middleware.OptionalAuthMiddleware(secret))
		var hadUser bool
		r.GET("/optional", func(c *gin.Context) {
			_, hadUser = c.Get("userID")
			c.Status(http.StatusOK)
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/optional", nil)
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.False(t, hadUser)
	})

	t.Run("valid header extracts user id", func(t *testing.T) {
		expectedUID := uuid.New()
		token := generateTestToken(secret, expectedUID.String(), "USER", false)

		r := gin.New()
		r.Use(middleware.OptionalAuthMiddleware(secret))
		var capturedUID uuid.UUID
		r.GET("/optional", func(c *gin.Context) {
			val, _ := c.Get("userID")
			if val != nil {
				capturedUID = val.(uuid.UUID)
			}
			c.Status(http.StatusOK)
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/optional", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, expectedUID, capturedUID)
	})
}
