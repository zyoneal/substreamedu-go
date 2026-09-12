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
		Type string `json:"type" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid request body"})
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

	switch req.Type {
	case "translation":
		user.TranslationCount++
	case "save":
		user.SavedWordsCount++
	default:
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid type: must be 'translation' or 'save'"})
		return
	}

	if err := h.userService.Update(c.Request.Context(), user); err != nil {
		respondError(c, err)
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
