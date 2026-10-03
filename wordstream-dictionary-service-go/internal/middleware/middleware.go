package middleware

import (
	"time"

	"github.com/gin-contrib/requestid"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// FAANG Pattern: Structured Logging with Correlation ID and request tracing
func Logging(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		reqID := requestid.Get(c)
		c.Set("request_id", reqID)

		// Create a logger for this request
		reqLogger := logger.With(zap.String("request_id", reqID))
		c.Set("logger", reqLogger)

		c.Next()

		// Log request completion (FAANG standard: trace every request)
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
