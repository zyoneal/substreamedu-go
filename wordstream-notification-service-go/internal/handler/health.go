// Package handler provides HTTP handlers.
package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// HealthHandler handles health endpoints.
type HealthHandler struct{}

// NewHealthHandler creates a new HealthHandler.
func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

// Health handles GET /actuator/health
func (h *HealthHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "UP"})
}

// Info handles GET /actuator/info
func (h *HealthHandler) Info(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"app": gin.H{
			"name":        "wordstream-notification-service",
			"version":     "1.0.0",
			"description": "Notification & Telegram Bot Service (Go)",
		},
	})
}

// Prometheus handles GET /actuator/prometheus
func (h *HealthHandler) Prometheus() gin.HandlerFunc {
	handler := promhttp.Handler()
	return func(c *gin.Context) {
		handler.ServeHTTP(c.Writer, c.Request)
	}
}
