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

type AuthHandler struct {
	authService		*service.AuthService
	googleAuthService	*service.GoogleAuthService
	logger			*zap.Logger
}

func NewAuthHandler(
	authService *service.AuthService,
	googleAuthService *service.GoogleAuthService,
	logger *zap.Logger,
) *AuthHandler {
	return &AuthHandler{
		authService:		authService,
		googleAuthService:	googleAuthService,
		logger:			logger,
	}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.AuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, apperror.BadRequest(err.Error()))
		return
	}

	telegramToken := uuid.New().String()

	if err := h.authService.SendMagicLink(c.Request.Context(), req.Email, telegramToken); err != nil {
		respondError(c, err)
		return
	}

	respondSuccessMessage(c, "Magic link sent to your email", nil)
}

func (h *AuthHandler) Verify(c *gin.Context) {
	var req dto.OtpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, apperror.BadRequest(err.Error()))
		return
	}

	authResp, err := h.authService.VerifyOTPAndAuthenticate(c.Request.Context(), req.Email, req.OTP)
	if err != nil {
		respondError(c, err)
		return
	}

	respondSuccess(c, authResp)
}

func (h *AuthHandler) GoogleAuth(c *gin.Context) {
	var req dto.GoogleAuthRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, apperror.BadRequest("Invalid request: "+err.Error()))
		return
	}

	token := strings.TrimSpace(req.Token)
	if token == "" {
		respondError(c, apperror.BadRequest("Token is required"))
		return
	}

	userInfo, err := h.googleAuthService.VerifyToken(c.Request.Context(), token)
	if err != nil {
		respondError(c, err)
		return
	}

	authResp, err := h.authService.AuthenticateGoogleUser(c.Request.Context(), userInfo.Email)
	if err != nil {
		respondError(c, err)
		return
	}

	h.logger.Info("Google authentication successful",
		zap.String("email", authResp.Email),
		zap.String("userId", authResp.UserID.String()),
	)

	respondSuccess(c, authResp)
}

func (h *AuthHandler) GetUserByTelegramToken(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, dto.Error[any]("Token is required"))
		return
	}

	user, err := h.authService.FindByTelegramToken(c.Request.Context(), token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Error[any]("Failed to find user"))
		return
	}

	if user == nil {
		c.JSON(http.StatusUnauthorized, dto.Error[any]("User not found"))
		return
	}

	c.JSON(http.StatusOK, dto.Success(user))
}
