package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func Logger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/media-service/actuator/") && c.Request.Method == "GET" {
			c.Next()
			return
		}

		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)

		logger.Info("HTTP request",
			zap.Int("status", c.Writer.Status()),
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.String("query", query),
			zap.String("ip", c.ClientIP()),
			zap.Duration("latency", latency),
			zap.String("user_agent", c.Request.UserAgent()),
		)
	}
}

func ValidateContentType() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
			contentType := c.Request.Header.Get("Content-Type")
			if c.Request.ContentLength > 0 &&
				!strings.HasPrefix(contentType, "application/json") &&
				!strings.HasPrefix(contentType, "multipart/form-data") {
				c.AbortWithStatusJSON(http.StatusUnsupportedMediaType, gin.H{"success": false, "message": "Content-Type must be application/json or multipart/form-data"})
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

func MaxBodySize(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}
