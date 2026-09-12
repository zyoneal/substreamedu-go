package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-iam-service/internal/apperror"
	"github.com/substreamedu/substreamedu-iam-service/internal/dto"
	"github.com/substreamedu/substreamedu-iam-service/internal/model"
	"github.com/substreamedu/substreamedu-iam-service/internal/service"
	"go.uber.org/zap"
)

type UserHandler struct {
	userService	*service.UserService
	logger		*zap.Logger
}

func NewUserHandler(userService *service.UserService, logger *zap.Logger) *UserHandler {
	return &UserHandler{
		userService:	userService,
		logger:		logger,
	}
}

func (h *UserHandler) GetUserDetails(c *gin.Context) {
	userIDStr := c.Param("userId")

	h.logger.Info("Fetching user details",
		zap.String("userId", userIDStr),
	)

	if userIDStr == "undefined" || userIDStr == "null" || userIDStr == "" {
		c.JSON(http.StatusBadRequest, dto.Error[any]("Invalid user ID"))
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Error[any]("Invalid user ID format"))
		return
	}

	authUserIDVal, exists := c.Get("userID")
	authRoleVal, _ := c.Get("userRole")
	if exists {
		if authUserID, ok := authUserIDVal.(uuid.UUID); ok {
			role, _ := authRoleVal.(string)
			if authUserID != userID && role != model.RoleAdmin {
				c.JSON(http.StatusForbidden, dto.Error[any]("Forbidden: Access denied"))
				return
			}
		}
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

	userDTO := dto.UserDTO{
		ID:			user.ID,
		Email:			user.Email,
		TelegramToken:		user.TelegramToken,
		IsPremium:		user.IsPremium,
		TranslationCount:	user.TranslationCount,
		SavedWordsCount:	user.SavedWordsCount,
	}

	respondSuccess(c, userDTO)
}
