package middleware

import (
	"crypto/subtle"
	"net/http"

	"github.com/gin-gonic/gin"
)

// InternalServiceKeyAuth protects internal inter-service endpoints.
// Requests must include a valid X-Internal-Service-Key header matching
// the shared secret configured via INTERNAL_SERVICE_KEY env variable.
// Uses constant-time comparison to prevent timing attacks.
func InternalServiceKeyAuth(key string) gin.HandlerFunc {
	keyBytes := []byte(key)
	return func(c *gin.Context) {
		provided := c.GetHeader("X-Internal-Service-Key")
		if provided == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "Forbidden: internal endpoint",
			})
			return
		}
		if subtle.ConstantTimeCompare(keyBytes, []byte(provided)) != 1 {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "Forbidden: invalid service key",
			})
			return
		}
		c.Next()
	}
}
