// Package middleware provides HTTP middleware components.
package middleware

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/substreamedu/wordstream-iam-service/internal/model"
	"github.com/substreamedu/wordstream-iam-service/internal/service"
	"go.uber.org/zap"
)

var (
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_server_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)

	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_server_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)
)

// RequestID returns a Gin middleware for adding correlation IDs.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		reqID := c.Request.Header.Get("X-Request-ID")
		if reqID == "" {
			reqID = time.Now().Format("20060102150405") + "-" + c.ClientIP() // Simple ID, in prod use UUID
		}
		c.Set("RequestID", reqID)
		c.Header("X-Request-ID", reqID)
		c.Next()
	}
}

// Logger returns a Gin middleware for structured logging with correlation IDs.
func Logger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		reqID, _ := c.Get("RequestID")

		// Process request
		c.Next()

		// Log after request
		duration := time.Since(start)
		statusCode := c.Writer.Status()

		logger.Info("HTTP request",
			zap.Any("request_id", reqID),
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.Int("status", statusCode),
			zap.Duration("duration", duration),
			zap.String("client_ip", c.ClientIP()),
			zap.Int("body_size", c.Writer.Size()),
		)

		// Record Prometheus metrics
		httpRequestsTotal.WithLabelValues(
			c.Request.Method,
			path,
			fmt.Sprintf("%d", statusCode),
		).Inc()

		httpRequestDuration.WithLabelValues(
			c.Request.Method,
			path,
		).Observe(duration.Seconds())
	}
}

// Recovery returns a Gin middleware for panic recovery.
func Recovery(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				logger.Error("Panic recovered",
					zap.Any("error", err),
					zap.String("path", c.Request.URL.Path),
				)
				c.AbortWithStatusJSON(500, gin.H{
					"success": false,
					"message": "Internal server error",
				})
			}
		}()
		c.Next()
	}
}

// CORS returns a Gin middleware for CORS handling.
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Id")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func AuthMiddleware(jwtService *service.JWTService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || len(authHeader) < 7 {
			c.AbortWithStatusJSON(401, gin.H{"success": false, "message": "Unauthorized"})
			return
		}
		tokenString := authHeader[7:]
		claims, err := jwtService.ValidateToken(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"success": false, "message": "Invalid token"})
			return
		}
		c.Set("userID", claims.ID)
		c.Set("userRole", claims.Role)
		c.Next()
	}
}

func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("userRole")
		if role != model.RoleAdmin {
			c.AbortWithStatusJSON(403, gin.H{"success": false, "message": "Forbidden: Admin access required"})
			return
		}
		c.Next()
	}
}
