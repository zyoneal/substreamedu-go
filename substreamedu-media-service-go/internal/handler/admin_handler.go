package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-media-service/internal/dto"
	"github.com/substreamedu/substreamedu-media-service/internal/service"
)

type AdminHandler struct {
	subtitleService *service.SubtitleService
}

func NewAdminHandler(ss *service.SubtitleService) *AdminHandler {
	return &AdminHandler{subtitleService: ss}
}

func (h *AdminHandler) GetUserMediaStats(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid user ID")
		return
	}

	subCount, err := h.subtitleService.CountUploadedSubtitles(c.Request.Context(), userID)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondSuccess(c, dto.UserMediaStatsDto{
		SubtitleCount: subCount,
	})
}

func (h *AdminHandler) respondError(c *gin.Context, code int, message string) {
	c.JSON(code, dto.ApiResponse{
		Success:	false,
		Message:	message,
		Timestamp:	time.Now(),
	})
}

func (h *AdminHandler) respondSuccess(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, dto.ApiResponse{
		Success:	true,
		Data:		data,
		Timestamp:	time.Now(),
	})
}
