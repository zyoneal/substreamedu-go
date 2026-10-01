package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/substreamedu/substreamedu-iam-service/internal/apperror"
	"github.com/substreamedu/substreamedu-iam-service/internal/dto"
	"github.com/substreamedu/substreamedu-iam-service/internal/repository"
	"go.uber.org/zap"
)

type AnalyticsHandler struct {
	repo   repository.AnalyticsRepository
	logger *zap.Logger
}

func NewAnalyticsHandler(repo repository.AnalyticsRepository, logger *zap.Logger) *AnalyticsHandler {
	return &AnalyticsHandler{
		repo:   repo,
		logger: logger,
	}
}

type RecordEventRequest struct {
	Event       string                 `json:"event" binding:"required"`
	Properties  map[string]interface{} `json:"properties"`
	AnonymousID string                 `json:"anonymousId"`
	UserID      string                 `json:"userId"`
}

func (h *AnalyticsHandler) RecordEvent(c *gin.Context) {
	var req RecordEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, apperror.BadRequest("Invalid event payload: event name is required"))
		return
	}

	eventName := strings.TrimSpace(req.Event)
	if eventName == "" {
		respondError(c, apperror.BadRequest("Event name cannot be empty"))
		return
	}

	var userID *string
	if uid, exists := c.Get("userID"); exists {
		if uidStr, ok := uid.(string); ok && uidStr != "" {
			userID = &uidStr
		}
	}
	if userID == nil && strings.TrimSpace(req.UserID) != "" {
		trimmed := strings.TrimSpace(req.UserID)
		userID = &trimmed
	}

	var anonID *string
	if strings.TrimSpace(req.AnonymousID) != "" {
		trimmed := strings.TrimSpace(req.AnonymousID)
		anonID = &trimmed
	}

	if err := h.repo.RecordEvent(c.Request.Context(), eventName, userID, anonID, req.Properties); err != nil {
		h.logger.Error("Failed to record analytics event",
			zap.String("event", eventName),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, dto.Error[any]("Failed to record event"))
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *AnalyticsHandler) GetAnalytics(c *gin.Context) {
	summary, err := h.repo.GetAnalyticsSummary(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to fetch analytics summary", zap.Error(err))
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Success(summary))
}
