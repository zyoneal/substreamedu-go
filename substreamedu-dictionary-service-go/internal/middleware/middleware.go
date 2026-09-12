package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-contrib/requestid"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

type Claims struct {
	ID			string	`json:"id"`
	Role			string	`json:"role"`
	IsPremium		bool	`json:"isPremium"`
	TranslationCount	int	`json:"translationCount"`
	SavedWordsCount		int	`json:"savedWordsCount"`
	jwt.RegisteredClaims
}

func AuthMiddleware(secretKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || len(authHeader) < 7 {
			c.AbortWithStatusJSON(401, gin.H{"success": false, "message": "Unauthorized"})
			return
		}
		tokenString := authHeader[7:]
		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secretKey), nil
		})
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"success": false, "message": "Invalid token"})
			return
		}
		claims, ok := token.Claims.(*Claims)
		if !ok || !token.Valid {
			c.AbortWithStatusJSON(401, gin.H{"success": false, "message": "Invalid token"})
			return
		}
		c.Set("userID", claims.ID)
		c.Set("userRole", claims.Role)
		c.Next()
	}
}

func OptionalAuthMiddleware(secretKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" && len(authHeader) >= 7 {
			tokenString := authHeader[7:]
			token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(secretKey), nil
			})
			if err == nil {
				if claims, ok := token.Claims.(*Claims); ok && token.Valid {
					c.Set("userID", claims.ID)
					c.Set("userRole", claims.Role)
					c.Set("isPremium", claims.IsPremium)
				}
			}
		}
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

func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("userRole")
		if role != "ADMIN" && role != "SYSTEM_ADMIN" {
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

func Logging(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/dictionary-service/actuator/") && (c.Request.Method == "GET" || c.Request.Method == "HEAD") {
			c.Next()
			return
		}

		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		reqID := requestid.Get(c)
		c.Set("request_id", reqID)

		reqLogger := logger.With(zap.String("request_id", reqID))
		c.Set("logger", reqLogger)

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		reqLogger.Info("Request Handled",
			zap.Int("status", status),
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.String("query", query),
			zap.String("ip", c.ClientIP()),
			zap.Duration("latency", latency),
			zap.String("user_agent", c.Request.UserAgent()),
		)
	}
}
