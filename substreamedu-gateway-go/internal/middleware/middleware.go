package middleware

import (
	"net/http"
	"strings"
	"time"

	"go.uber.org/zap"
)

type responseWriter struct {
	http.ResponseWriter
	statusCode	int
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	originsMap := make(map[string]bool)
	for _, o := range allowedOrigins {
		originsMap[o] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" {
				if originsMap[origin] {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Access-Control-Allow-Credentials", "true")
				} else if originsMap["*"] {
					w.Header().Set("Access-Control-Allow-Origin", "*")
				} else {
					if r.Method == http.MethodOptions {
						w.WriteHeader(http.StatusForbidden)
						return
					}
				}
			}

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept, Accept-Language, X-Requested-With, X-Request-ID, X-Correlation-ID, traceparent, tracestate, baggage, sentry-trace, refresh-token")
			w.Header().Set("Access-Control-Expose-Headers", "X-Request-ID, X-Correlation-ID, Authorization")
			w.Header().Set("Access-Control-Max-Age", "3600")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func Logging(logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/gateway/actuator/") && (r.Method == "GET" || r.Method == "HEAD") {
				next.ServeHTTP(w, r)
				return
			}

			start := time.Now()
			rw := newResponseWriter(w)
			next.ServeHTTP(rw, r)
			logger.Info("request",
				zap.String("method", r.Method),
				zap.String("path", r.URL.Path),
				zap.Int("status", rw.statusCode),
				zap.Duration("duration", time.Since(start)),
				zap.String("client_ip", r.RemoteAddr),
				zap.String("user_agent", r.UserAgent()),
			)
		})
	}
}

// StripSpoofableHeaders removes headers that must only be set by trusted
// internal services (not by external clients). This prevents IDOR attacks
// where a malicious client sets X-User-Id to impersonate another user.
func StripSpoofableHeaders() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Header.Del("X-User-Id")
			r.Header.Del("X-User-Email")
			r.Header.Del("X-Internal-Service-Key")
			next.ServeHTTP(w, r)
		})
	}
}
