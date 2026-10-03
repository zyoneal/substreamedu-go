// Package handler provides HTTP request handlers.
package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// HealthHandler handles health check and metrics endpoints.
type HealthHandler struct {
	pool *pgxpool.Pool
}

// NewHealthHandler creates a new HealthHandler.
func NewHealthHandler(pool *pgxpool.Pool) *HealthHandler {
	return &HealthHandler{pool: pool}
}

// HealthResponse represents health check response.
type HealthResponse struct {
	Status string `json:"status"`
}

// Health handles GET /actuator/health
func (h *HealthHandler) Health(c *gin.Context) {
	if h.pool != nil {
		if err := h.pool.Ping(c.Request.Context()); err != nil {
			c.JSON(http.StatusServiceUnavailable, HealthResponse{Status: "DOWN"})
			return
		}
	}
	c.JSON(http.StatusOK, HealthResponse{Status: "UP"})
}

// Info handles GET /actuator/info
func (h *HealthHandler) Info(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"app": gin.H{
			"name":        "wordstream-iam-service",
			"version":     "1.0.0",
			"description": "Identity and Access Management Service for WordStream (Go)",
		},
	})
}

// Metrics handles GET /actuator/metrics
func (h *HealthHandler) Metrics(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"names": []string{"http.server.requests", "jvm.memory.used"},
	})
}

// Prometheus handles GET /actuator/prometheus
// Returns Prometheus-compatible metrics.
func (h *HealthHandler) Prometheus() gin.HandlerFunc {
	handler := promhttp.Handler()
	return func(c *gin.Context) {
		handler.ServeHTTP(c.Writer, c.Request)
	}
}
