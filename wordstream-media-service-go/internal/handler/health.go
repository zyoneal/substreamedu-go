package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type HealthHandler struct{}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

func (h *HealthHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "UP"})
}

func (h *HealthHandler) Info(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"app": gin.H{
			"name":    "wordstream-media-service",
			"version": "1.0.0",
		},
	})
}

func (h *HealthHandler) Prometheus() gin.HandlerFunc {
	handler := promhttp.Handler()
	return func(c *gin.Context) {
		handler.ServeHTTP(c.Writer, c.Request)
	}
}
