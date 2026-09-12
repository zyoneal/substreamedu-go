package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-iam-service/internal/apperror"
	"github.com/substreamedu/substreamedu-iam-service/internal/dto"
	"github.com/substreamedu/substreamedu-iam-service/internal/service"
	"go.uber.org/zap"
)

var validPromoCodes = map[string]bool{
	"STREAMLEARN":	true,
	"MPVOL5":	true,
}

type PromoHandler struct {
	userService	*service.UserService
	logger		*zap.Logger
}

func NewPromoHandler(userService *service.UserService, logger *zap.Logger) *PromoHandler {
	return &PromoHandler{
		userService:	userService,
		logger:		logger,
	}
}

type PromoRequest struct {
	Code string `json:"code" binding:"required"`
}

func (h *PromoHandler) ApplyPromo(c *gin.Context) {
	var req PromoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, apperror.BadRequest("Invalid request: promo code is required"))
		return
	}

	userIDStr, exists := c.Get("userID")
	if !exists {
		respondError(c, apperror.Unauthorized("User not authenticated"))
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		respondError(c, apperror.BadRequest("Invalid user ID"))
		return
	}

	code := strings.TrimSpace(strings.ToUpper(req.Code))
	if !validPromoCodes[code] {
		h.logger.Warn("Invalid promo code attempt",
			zap.String("userId", userID.String()),
			zap.String("code", req.Code),
		)
		c.JSON(http.StatusBadRequest, dto.Error[any]("Invalid promo code"))
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

	if user.IsPremium {
		c.JSON(http.StatusConflict, dto.Error[any]("You already have premium access"))
		return
	}

	user.IsPremium = true
	if err := h.userService.Update(c.Request.Context(), user); err != nil {
		h.logger.Error("Failed to update user premium status",
			zap.String("userId", userID.String()),
			zap.Error(err),
		)
		respondError(c, err)
		return
	}

	h.logger.Info("Promo code applied successfully",
		zap.String("userId", userID.String()),
		zap.String("email", user.Email),
	)

	c.JSON(http.StatusOK, dto.Success(map[string]interface{}{
		"message":	"Premium activated successfully!",
		"isPremium":	true,
	}))
}
