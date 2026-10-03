package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type HealthHandler struct{}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

func (h *HealthHandler) Liveness(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "UP"})
}

func (h *HealthHandler) Readiness(c *gin.Context) {
	// In a real FAANG service, we'd check DB/Redis connectivity here
	c.JSON(http.StatusOK, gin.H{"status": "UP"})
}

func (h *HealthHandler) Info(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"app": gin.H{
			"name":    "wordstream-dictionary-service",
			"version": "1.0.0",
		},
	})
}
