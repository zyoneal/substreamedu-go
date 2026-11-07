package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/substreamedu/substreamedu-iam-service/internal/model"
	"github.com/substreamedu/substreamedu-iam-service/internal/service"
	"go.uber.org/zap"
)

var (
	httpRequestsTotal	= promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name:	"http_server_requests_total",
			Help:	"Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)

	httpRequestDuration	= promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:		"http_server_request_duration_seconds",
			Help:		"HTTP request duration in seconds",
			Buckets:	prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)
)

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		reqID := c.Request.Header.Get("X-Request-ID")
		if reqID == "" {
			reqID = uuid.New().String()
		}
		c.Set("RequestID", reqID)
		c.Header("X-Request-ID", reqID)
		c.Next()
	}
}

func Logger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/auth-service/actuator/") && c.Request.Method == "GET" {
			c.Next()
			return
		}

		start := time.Now()
		path := c.Request.URL.Path
		reqID, _ := c.Get("RequestID")

		c.Next()

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

func Recovery(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				logger.Error("Panic recovered",
					zap.Any("error", err),
					zap.String("path", c.Request.URL.Path),
				)
				c.AbortWithStatusJSON(500, gin.H{
					"success":	false,
					"message":	"Internal server error",
				})
			}
		}()
		c.Next()
	}
}

func AuthMiddleware(jwtService *service.JWTService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(401, gin.H{"success": false, "message": "Unauthorized"})
			return
		}
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
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

func MaxBodySize(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

func ValidateContentType() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
			if c.Request.ContentLength > 0 && !strings.HasPrefix(c.Request.Header.Get("Content-Type"), "application/json") {
				c.AbortWithStatusJSON(http.StatusUnsupportedMediaType, gin.H{"success": false, "message": "Content-Type must be application/json"})
				return
			}
		}
		c.Next()
	}
}

type RateLimiter struct {
	mu		sync.Mutex
	visitors	map[string][]time.Time
	limit		int
	window		time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		visitors:	make(map[string][]time.Time),
		limit:		limit,
		window:		window,
	}
	go rl.cleanup()
	return rl
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(rl.window)
	defer ticker.Stop()
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for ip, timestamps := range rl.visitors {
			var active []time.Time
			for _, t := range timestamps {
				if now.Sub(t) < rl.window {
					active = append(active, t)
				}
			}
			if len(active) == 0 {
				delete(rl.visitors, ip)
			} else {
				rl.visitors[ip] = active
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *RateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	timestamps := rl.visitors[ip]

	var active []time.Time
	for _, t := range timestamps {
		if now.Sub(t) < rl.window {
			active = append(active, t)
		}
	}

	if len(active) >= rl.limit {
		rl.visitors[ip] = active
		return false
	}

	active = append(active, now)
	rl.visitors[ip] = active
	return true
}

func RateLimit(limiter *RateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !limiter.allow(c.ClientIP()) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"success":	false,
				"message":	"Too many requests. Please try again later.",
			})
			return
		}
		c.Next()
	}
}
