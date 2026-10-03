package middleware

import (
	"net/http"
)

func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	originsMap := make(map[string]bool)
	for _, o := range allowedOrigins {
		originsMap[o] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if originsMap[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else if len(allowedOrigins) > 0 {
				// Fallback to first origin or handle wildcard if needed
				w.Header().Set("Access-Control-Allow-Origin", allowedOrigins[0])
			}

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept, Accept-Language, X-Requested-With, X-Request-ID, X-Correlation-ID, X-User-Id, X-User-Email, traceparent, tracestate, baggage, sentry-trace, refresh-token")
			w.Header().Set("Access-Control-Expose-Headers", "X-Request-ID, X-Correlation-ID, Authorization")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Max-Age", "3600")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// In a real FAANG service, we'd log request details and correlation ID
		next.ServeHTTP(w, r)
	})
}
