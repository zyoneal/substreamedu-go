package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
)

// GenerateLessonPlan creates a comprehensive lesson plan using AI from video subtitles
func (h *DictionaryHandler) GenerateLessonPlan(c *gin.Context) {
	var req dto.GenerateLessonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: "Invalid request payload: " + err.Error()})
		return
	}

	plan, err := h.aiService.GenerateLessonPlan(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: "Failed to generate lesson plan: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{
		Status: "success",
		Data:   plan,
	})
}

// SaveLessonPlan saves a new or customized lesson plan to the database
func (h *DictionaryHandler) SaveLessonPlan(c *gin.Context) {
	if h.lessonRepo == nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: "Lesson repository not initialized"})
		return
	}

	var req dto.SaveLessonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: "Invalid lesson payload: " + err.Error()})
		return
	}

	var userStr *string
	if uid := h.getOptionalUserId(c); uid != nil {
		str := uid.String()
		userStr = &str
	}

	lesson, err := h.lessonRepo.CreateLesson(c.Request.Context(), userStr, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: "Failed to save lesson: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{
		Status: "success",
		Data:   lesson,
	})
}

// GetSharedLessonPlan returns a lesson by its share token for student consumption (no auth required)
func (h *DictionaryHandler) GetSharedLessonPlan(c *gin.Context) {
	if h.lessonRepo == nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: "Lesson repository not initialized"})
		return
	}

	shareToken := strings.TrimSpace(c.Param("shareToken"))
	if shareToken == "" {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: "Share token is required"})
		return
	}

	lesson, err := h.lessonRepo.GetByShareToken(c.Request.Context(), shareToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: "Failed to query lesson: " + err.Error()})
		return
	}
	if lesson == nil {
		c.JSON(http.StatusNotFound, dto.ApiResponse{Status: "error", Message: "Lesson not found"})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{
		Status: "success",
		Data:   lesson,
	})
}

// GetMyLessons returns all lessons created by the authenticated user
func (h *DictionaryHandler) GetMyLessons(c *gin.Context) {
	if h.lessonRepo == nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: "Lesson repository not initialized"})
		return
	}

	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	lessons, err := h.lessonRepo.GetByUserID(c.Request.Context(), userID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: "Failed to fetch user lessons: " + err.Error()})
		return
	}

	if lessons == nil {
		lessons = []dto.LessonResponse{}
	}

	c.JSON(http.StatusOK, dto.ApiResponse{
		Status: "success",
		Data:   lessons,
	})
}

// DeleteLessonPlan deletes a lesson owned by the user
func (h *DictionaryHandler) DeleteLessonPlan(c *gin.Context) {
	if h.lessonRepo == nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: "Lesson repository not initialized"})
		return
	}

	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	lessonID := c.Param("id")
	if lessonID == "" {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: "Lesson ID is required"})
		return
	}

	if err := h.lessonRepo.DeleteByID(c.Request.Context(), lessonID, userID.String()); err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{
		Status:  "success",
		Message: "Lesson deleted successfully",
	})
}
