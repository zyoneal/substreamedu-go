package middleware

import (
	"net/http"
	"strings"

	"github.com/substreamedu/substreamedu-gateway/internal/cache"
	"go.uber.org/zap"
)

func TokenRevocation(respCache *cache.ResponseCache, logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
				if tokenStr != "" && respCache != nil {

					identifier := tokenStr
					if len(tokenStr) > 32 {
						identifier = tokenStr[len(tokenStr)-32:]
					}

					if respCache.IsTokenBlacklisted(r.Context(), identifier) {
						logger.Warn("Blocked access attempt using revoked JWT token",
							zap.String("client_ip", r.RemoteAddr),
							zap.String("path", r.URL.Path),
						)
						http.Error(w, `{"error":"Token has been revoked"}`, http.StatusUnauthorized)
						return
					}
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}
