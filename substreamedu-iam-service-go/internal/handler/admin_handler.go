package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-iam-service/internal/apperror"
	"github.com/substreamedu/substreamedu-iam-service/internal/service"
	"go.uber.org/zap"
)

type AdminHandler struct {
	userService	*service.UserService
	logger		*zap.Logger
}

func NewAdminHandler(userService *service.UserService, logger *zap.Logger) *AdminHandler {
	return &AdminHandler{
		userService:	userService,
		logger:		logger,
	}
}

func (h *AdminHandler) ListUsers(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	query := c.Query("query")
	sortBy := c.DefaultQuery("sortBy", "created_at")
	sortOrder := c.DefaultQuery("sortOrder", "DESC")

	var isPremium *bool
	if premiumStr := c.Query("isPremium"); premiumStr != "" {
		premium := premiumStr == "true"
		isPremium = &premium
	}

	users, err := h.userService.FindAll(c.Request.Context(), limit, offset, query, isPremium, sortBy, sortOrder)
	if err != nil {
		respondError(c, err)
		return
	}

	total, err := h.userService.CountAll(c.Request.Context(), query, isPremium)
	if err != nil {
		respondError(c, err)
		return
	}

	respondSuccess(c, gin.H{
		"users":	users,
		"total":	total,
	})
}

func (h *AdminHandler) UpdateUser(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		respondError(c, apperror.BadRequest("Invalid user ID"))
		return
	}

	var req struct {
		IsPremium		*bool	`json:"isPremium"`
		Role			*string	`json:"role"`
		TranslationCount	*int	`json:"translationCount"`
		SavedWordsCount		*int	`json:"savedWordsCount"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, apperror.BadRequest("Invalid request body"))
		return
	}

	user, err := h.userService.FindByID(c.Request.Context(), userID)
	if err != nil {
		respondError(c, err)
		return
	}
	if user == nil {
		respondError(c, apperror.NotFound("User not found"))
		return
	}

	if req.IsPremium != nil {
		user.IsPremium = *req.IsPremium
	}
	if req.Role != nil {
		user.Role = *req.Role
	}
	if req.TranslationCount != nil {
		user.TranslationCount = *req.TranslationCount
	}
	if req.SavedWordsCount != nil {
		user.SavedWordsCount = *req.SavedWordsCount
	}

	if err := h.userService.Update(c.Request.Context(), user); err != nil {
		respondError(c, err)
		return
	}

	respondSuccess(c, user)
}
