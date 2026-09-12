package middleware

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/propagation"
)

func Tracing(serviceName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		propagator := otel.GetTextMapPropagator()
		ctx := propagator.Extract(c.Request.Context(), propagation.HeaderCarrier(c.Request.Header))

		tracer := otel.Tracer(serviceName)
		spanName := c.Request.Method + " " + c.Request.URL.Path

		ctx, span := tracer.Start(ctx, spanName)
		defer span.End()

		scheme := "http"
		if c.Request.TLS != nil {
			scheme = "https"
		}

		span.SetAttributes(
			attribute.String("http.method", c.Request.Method),
			attribute.String("http.url", c.Request.URL.String()),
			attribute.String("http.target", c.Request.URL.Path),
			attribute.String("http.host", c.Request.Host),
			attribute.String("http.scheme", scheme),
			attribute.String("http.user_agent", c.Request.UserAgent()),
			attribute.String("http.request_id", c.GetString("RequestID")),
		)

		if ip := c.ClientIP(); ip != "" {
			span.SetAttributes(attribute.String("net.peer.ip", ip))
		}

		c.Request = c.Request.WithContext(ctx)

		c.Next()

		statusCode := c.Writer.Status()
		span.SetAttributes(attribute.Int("http.status_code", statusCode))

		if statusCode >= 500 {
			span.SetStatus(codes.Error, fmt.Sprintf("HTTP %d", statusCode))
		}
	}
}
