// Package handler provides HTTP request handlers.
package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/substreamedu/wordstream-iam-service/internal/apperror"
	"github.com/substreamedu/wordstream-iam-service/internal/dto"
	"github.com/substreamedu/wordstream-iam-service/internal/service"
	"go.uber.org/zap"
)

// UserHandler handles user-related HTTP requests.
type UserHandler struct {
	userService *service.UserService
	logger      *zap.Logger
}

// NewUserHandler creates a new UserHandler.
func NewUserHandler(userService *service.UserService, logger *zap.Logger) *UserHandler {
	return &UserHandler{
		userService: userService,
		logger:      logger,
	}
}

// GetUserDetails handles GET /users/:userId
func (h *UserHandler) GetUserDetails(c *gin.Context) {
	userIDStr := c.Param("userId")

	h.logger.Info("Fetching user details",
		zap.String("userId", userIDStr),
	)

	// Handle invalid user IDs
	if userIDStr == "undefined" || userIDStr == "null" || userIDStr == "" {
		c.JSON(http.StatusBadRequest, dto.Error[any]("Invalid user ID"))
		return
	}

	// Parse UUID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Error[any]("Invalid user ID format"))
		return
	}

	// Find user
	user, err := h.userService.FindByID(c.Request.Context(), userID)
	if err != nil {
		respondError(c, err)
		return
	}

	if user == nil {
		respondError(c, apperror.NotFound("User not found"))
		return
	}

	// Map to DTO
	userDTO := dto.UserDTO{
		ID:            user.ID,
		Email:         user.Email,
		TelegramToken: user.TelegramToken,
	}

	respondSuccess(c, userDTO)
}
