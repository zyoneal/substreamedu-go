package middleware

import (
	"net/http"
	"strings"
)

// BlockInternalRoutes ensures that private inter-service paths cannot be accessed externally through the gateway.
func BlockInternalRoutes() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			path := strings.ToLower(r.URL.Path)
			if strings.Contains(path, "/internal/") || strings.HasSuffix(path, "/internal") {
				http.Error(w, `{"error":"Access denied: internal endpoint"}`, http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
