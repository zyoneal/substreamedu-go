package middleware

import (
	"net/http"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

func Tracing(serviceName string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			spanName := r.Method + " " + r.URL.Path
			tracer := otel.Tracer(serviceName)
			ctx, span := tracer.Start(r.Context(), spanName,
				trace.WithAttributes(
					attribute.String("http.method", r.Method),
					attribute.String("http.url", r.URL.String()),
					attribute.String("http.target", r.URL.RequestURI()),
					attribute.String("http.host", r.Host),
					attribute.String("http.scheme", func() string {
						if r.TLS != nil {
							return "https"
						}
						return "http"
					}()),
					attribute.String("http.user_agent", r.UserAgent()),
				),
			)
			defer span.End()

			rw := newResponseWriter(w)
			next.ServeHTTP(rw, r.WithContext(ctx))
			span.SetAttributes(attribute.Int("http.status_code", rw.statusCode))

			if rw.statusCode >= 500 {
				span.SetStatus(codes.Error, "HTTP "+http.StatusText(rw.statusCode))
			}
		})
	}
}
