package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-iam-service/internal/service"
	"go.uber.org/zap"
)

type UsageHandler struct {
	userService	*service.UserService
	logger		*zap.Logger
}

func NewUsageHandler(userService *service.UserService, logger *zap.Logger) *UsageHandler {
	return &UsageHandler{
		userService:	userService,
		logger:		logger,
	}
}

type UsageResponse struct {
	IsPremium		bool	`json:"isPremium"`
	TranslationCount	int	`json:"translationCount"`
	SavedWordsCount		int	`json:"savedWordsCount"`
}

func (h *UsageHandler) GetUsage(c *gin.Context) {
	userIDStr := c.Param("userId")
	if userIDStr == "" || userIDStr == "undefined" || userIDStr == "null" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid user ID"})
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid user ID format"})
		return
	}

	user, err := h.userService.FindByID(c.Request.Context(), userID)
	if err != nil {
		respondError(c, err)
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":	true,
		"data": UsageResponse{
			IsPremium:		user.IsPremium,
			TranslationCount:	user.TranslationCount,
			SavedWordsCount:	user.SavedWordsCount,
		},
	})
}

func (h *UsageHandler) IncrementUsage(c *gin.Context) {
	userIDStr := c.Param("userId")
	if userIDStr == "" || userIDStr == "undefined" || userIDStr == "null" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid user ID"})
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid user ID format"})
		return
	}

	var req struct {
		Type  string `json:"type" binding:"required"`
		Delta int    `json:"delta"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid request body"})
		return
	}

	if req.Type != "translation" && req.Type != "save" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid type: must be 'translation' or 'save'"})
		return
	}

	delta := req.Delta
	if delta <= 0 {
		delta = 1
	}

	user, err := h.userService.IncrementUsage(c.Request.Context(), userID, req.Type, delta)
	if err != nil {
		respondError(c, err)
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":	true,
		"data": UsageResponse{
			IsPremium:		user.IsPremium,
			TranslationCount:	user.TranslationCount,
			SavedWordsCount:	user.SavedWordsCount,
		},
	})
}

func (h *UsageHandler) DecrementUsage(c *gin.Context) {
	userIDStr := c.Param("userId")
	if userIDStr == "" || userIDStr == "undefined" || userIDStr == "null" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid user ID"})
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid user ID format"})
		return
	}

	var req struct {
		Type  string `json:"type" binding:"required"`
		Delta int    `json:"delta"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid request body"})
		return
	}

	if req.Type != "translation" && req.Type != "save" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid type: must be 'translation' or 'save'"})
		return
	}

	delta := req.Delta
	if delta <= 0 {
		delta = 1
	}

	user, err := h.userService.DecrementUsage(c.Request.Context(), userID, req.Type, delta)
	if err != nil {
		respondError(c, err)
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":	true,
		"data": UsageResponse{
			IsPremium:		user.IsPremium,
			TranslationCount:	user.TranslationCount,
			SavedWordsCount:	user.SavedWordsCount,
		},
	})
}
