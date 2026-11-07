package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/service"
)

type AdminHandler struct {
	vocabularyService *service.VocabularyService
}

func NewAdminHandler(vs *service.VocabularyService) *AdminHandler {
	return &AdminHandler{vocabularyService: vs}
}

func (h *AdminHandler) GetUserOverview(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: "Invalid user ID"})
		return
	}

	wordCount, err := h.vocabularyService.GetTotalWords(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	groups, err := h.vocabularyService.GetVocabularyGroups(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{
		Status:	"success",
		Data: dto.UserOverviewDto{
			WordCount:	wordCount,
			ResourceCount:	len(groups),
		},
	})
}

func (h *AdminHandler) GetTopUsers(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	limit := 10
	if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
		limit = parsed
	}

	users, err := h.vocabularyService.GetTopUsersByWordCount(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{
		Status:	"success",
		Data:	users,
	})
}

func (h *AdminHandler) ResetSRSProgress(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: "Invalid user ID"})
		return
	}

	affected, err := h.vocabularyService.ResetAllSRSProgress(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{
		Status:		"success",
		Message:	fmt.Sprintf("Reset SRS progress for %d cards", affected),
	})
}

func (h *AdminHandler) ResetSRSProgressGlobal(c *gin.Context) {
	affected, err := h.vocabularyService.ResetAllSRSProgressGlobal(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{
		Status:		"success",
		Message:	fmt.Sprintf("Global reset: %d cards reset across all users", affected),
	})
}
