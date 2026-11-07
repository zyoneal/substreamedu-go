package middleware

import (
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
	"go.opentelemetry.io/otel/trace"

	"github.com/gin-gonic/gin"
)

func Tracing(serviceName string) gin.HandlerFunc {
	prop := otel.GetTextMapPropagator()

	return func(c *gin.Context) {
		ctx := prop.Extract(c.Request.Context(), propagationHeaderCarrier(c.Request.Header))
		tracer := otel.Tracer(serviceName)

		spanName := c.Request.Method + " " + c.Request.URL.Path

		attrs := []attribute.KeyValue{
			semconv.HTTPMethodKey.String(c.Request.Method),
			semconv.HTTPURLKey.String(c.Request.URL.String()),
			semconv.HTTPTargetKey.String(c.Request.URL.RequestURI()),
			semconv.HTTPHostKey.String(c.Request.Host),
			semconv.HTTPSchemeKey.String(c.Request.URL.Scheme),
			semconv.HTTPUserAgentKey.String(c.Request.UserAgent()),
			semconv.NetPeerIPKey.String(c.ClientIP()),
		}

		ctx, span := tracer.Start(ctx, spanName,
			trace.WithAttributes(attrs...),
		)
		defer span.End()

		c.Request = c.Request.WithContext(ctx)

		c.Next()

		status := c.Writer.Status()
		span.SetAttributes(semconv.HTTPStatusCodeKey.Int(status))
		if status >= 500 {
			span.SetStatus(codes.Error, "HTTP status "+string(rune(status)))
		}
	}
}

type propagationHeaderCarrier map[string][]string

func (c propagationHeaderCarrier) Get(key string) string {
	if v := c[key]; len(v) > 0 {
		return v[0]
	}
	return ""
}

func (c propagationHeaderCarrier) Set(key, value string) {
	c[key] = []string{value}
}

func (c propagationHeaderCarrier) Keys() []string {
	keys := make([]string, 0, len(c))
	for k := range c {
		keys = append(keys, k)
	}
	return keys
}
