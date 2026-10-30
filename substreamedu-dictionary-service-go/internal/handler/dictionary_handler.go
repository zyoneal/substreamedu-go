package handler

import (
	"context"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"go.uber.org/zap"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/client"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/model"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/repository"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/service"
)

const (
	translationLimit   = 100
	savedWordsLimit    = 50
	maxAnkiExportCards = 2500
)

type DictionaryHandler struct {
	vocabularyService     *service.VocabularyService
	learningService       *service.LearningService
	aiService             *service.AIService
	nounProjectService    *service.NounProjectService
	iamClient             *client.IAMClient
	lessonRepo            *repository.LessonRepository
	categorizationService *service.CategorizationService
}

func NewDictionaryHandler(vs *service.VocabularyService, ls *service.LearningService, as *service.AIService, nps *service.NounProjectService, ic *client.IAMClient, lr *repository.LessonRepository, cs *service.CategorizationService) *DictionaryHandler {
	return &DictionaryHandler{
		vocabularyService:     vs,
		learningService:       ls,
		aiService:             as,
		nounProjectService:    nps,
		iamClient:             ic,
		lessonRepo:            lr,
		categorizationService: cs,
	}
}

func (h *DictionaryHandler) getUserId(c *gin.Context) (uuid.UUID, bool) {
	// SECURITY: userId must come exclusively from verified JWT claims.
	// Never trust client-supplied X-User-Id headers or ?userId= query params.
	if authIDVal, exists := c.Get("userID"); exists {
		if authIDStr, ok := authIDVal.(string); ok && authIDStr != "" {
			if uid, err := uuid.Parse(authIDStr); err == nil {
				return uid, true
			}
		}
	}

	c.JSON(http.StatusUnauthorized, dto.ApiResponse{Status: "error", Message: "Authentication required"})
	return uuid.Nil, false
}

func (h *DictionaryHandler) getOptionalUserId(c *gin.Context) *uuid.UUID {
	// SECURITY: userId must come exclusively from verified JWT claims.
	if authIDVal, exists := c.Get("userID"); exists {
		if authIDStr, ok := authIDVal.(string); ok && authIDStr != "" {
			if uid, err := uuid.Parse(authIDStr); err == nil {
				return &uid
			}
		}
	}
	return nil
}

func (h *DictionaryHandler) checkLimit(c *gin.Context, userID uuid.UUID, limitType string) bool {
	if h.iamClient == nil {
		return true
	}

	usage, err := h.iamClient.GetUsage(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusForbidden, dto.ApiResponse{Status: "error", Message: "Failed to verify usage limits"})
		return false
	}

	if usage == nil {
		return true
	}

	if usage.IsPremium {
		return true
	}

	switch limitType {
	case "translation":
		if usage.TranslationCount >= translationLimit {
			c.JSON(http.StatusForbidden, dto.ApiResponse{Status: "error", Message: "Translation limit reached. Upgrade to premium for unlimited translations."})
			return false
		}
	case "save":
		if usage.SavedWordsCount >= savedWordsLimit {
			c.JSON(http.StatusForbidden, dto.ApiResponse{Status: "error", Message: "Word save limit reached. Upgrade to premium for unlimited saves."})
			return false
		}
	}

	return true
}

func (h *DictionaryHandler) AddWord(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	var req dto.AddWordRequestDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	if !h.checkLimit(c, userID, "save") {
		return
	}

	res, err := h.vocabularyService.AddWord(c.Request.Context(), userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	if h.iamClient != nil {
		var log *zap.Logger
		if l, ok := c.Get("logger"); ok {
			log = l.(*zap.Logger)
		}
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if err := h.iamClient.IncrementUsage(ctx, userID, "save"); err != nil && log != nil {
				log.Warn("Failed to increment usage", zap.Error(err))
			}
		}()
	}

	c.JSON(http.StatusCreated, dto.ApiResponse{Status: "success", Data: res})
}

func (h *DictionaryHandler) GetDailyCards(c *gin.Context) {
	userID := h.getOptionalUserId(c)
	if userID == nil {
		c.JSON(http.StatusOK, dto.ApiResponse{
			Status: "success",
			Data: &dto.DailySessionDto{
				Cards:               []dto.DictionaryItemDto{},
				TotalDictionarySize: 0,
			},
		})
		return
	}

	loc := h.resolveLocation(c)
	res, err := h.learningService.GetDailyCards(c.Request.Context(), *userID, loc)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: res})
}

func (h *DictionaryHandler) RefreshSRS(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	if err := h.learningService.RefreshSession(c.Request.Context(), userID); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Message: "Session refreshed"})
}

func (h *DictionaryHandler) ReviewCard(c *gin.Context) {
	cardIDStr := c.Param("id")
	cardID, err := strconv.ParseInt(cardIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: "Invalid cardId"})
		return
	}

	var req dto.ReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	res, err := h.learningService.ReviewCard(c.Request.Context(), cardID, req.Rating, req.ResponseTimeMs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, res)
}
func (h *DictionaryHandler) GetAllLexemes(c *gin.Context) {
	uid := h.getOptionalUserId(c)
	if uid == nil {
		c.JSON(http.StatusOK, dto.ApiResponse{
			Status: "success",
			Data: &dto.PaginatedResponse{
				Items:   []dto.DictionaryItemDto{},
				HasMore: false,
			},
		})
		return
	}

	cursor := int64(0)
	if cursorStr := c.Query("cursor"); cursorStr != "" {
		if parsed, err := strconv.ParseInt(cursorStr, 10, 64); err == nil {
			cursor = parsed
		}
	}

	limit := 1000
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 && parsed <= 10000 {
			limit = parsed
		}
	}

	res, err := h.vocabularyService.GetAllLexemesPaginated(c.Request.Context(), *uid, cursor, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: res})
}

func (h *DictionaryHandler) GetAllLexemesLight(c *gin.Context) {
	uid := h.getOptionalUserId(c)
	if uid == nil {
		c.JSON(http.StatusOK, dto.ApiResponse{
			Status: "success",
			Data: &dto.PaginatedResponse{
				Items:   []dto.LexemeLightDto{},
				HasMore: false,
			},
		})
		return
	}

	cursor := int64(0)
	if cursorStr := c.Query("cursor"); cursorStr != "" {
		if parsed, err := strconv.ParseInt(cursorStr, 10, 64); err == nil {
			cursor = parsed
		}
	}

	limit := 1000
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 && parsed <= 10000 {
			limit = parsed
		}
	}

	res, err := h.vocabularyService.GetAllLexemesLightPaginated(c.Request.Context(), *uid, cursor, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: res})
}

func (h *DictionaryHandler) GetByResource(c *gin.Context) {
	uid := h.getOptionalUserId(c)
	if uid == nil {
		c.JSON(http.StatusOK, dto.ApiResponse{
			Status: "success",
			Data: &dto.PaginatedResponse{
				Items:   []dto.DictionaryItemDto{},
				HasMore: false,
			},
		})
		return
	}


	name, err := url.PathUnescape(c.Param("name"))
	if err != nil {
		name = c.Param("name")
	}

	cursor := int64(0)
	if cursorStr := c.Query("cursor"); cursorStr != "" {
		if parsed, err := strconv.ParseInt(cursorStr, 10, 64); err == nil {
			cursor = parsed
		}
	}

	limit := 50
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	start := time.Now()
	res, err := h.vocabularyService.GetLexemesByResourcePaginated(c.Request.Context(), *uid, name, cursor, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	duration := time.Since(start)
	zap.L().Info("GetByResource performance",
		zap.String("resource", name),
		zap.Int64("cursor", cursor),
		zap.Int("limit", limit),
		zap.Duration("duration", duration),
	)

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: res})
}

func (h *DictionaryHandler) GetAllGroups(c *gin.Context) {
	uid := h.getOptionalUserId(c)
	if uid == nil {
		c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: []model.DictionaryGroup{}})
		return
	}

	res, err := h.vocabularyService.GetVocabularyGroups(c.Request.Context(), *uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	if res == nil {
		res = []model.DictionaryGroup{}
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: res})
}


func (h *DictionaryHandler) GetRandomWord(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}
	res, err := h.vocabularyService.GetRandomWord(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}
	if res == nil {
		c.JSON(http.StatusNotFound, dto.ApiResponse{Status: "error", Message: "no words found"})
		return
	}
	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: res})
}

func (h *DictionaryHandler) resolveLocation(c *gin.Context) *time.Location {
	tz := c.GetHeader("X-Timezone")
	if tz == "" {
		tz = c.Query("tz")
	}
	if tz == "" {
		return time.UTC
	}
	loc, err := time.LoadLocation(tz)
	if err != nil || loc == nil {
		return time.UTC
	}
	return loc
}

func (h *DictionaryHandler) GetStreak(c *gin.Context) {
	userID := h.getOptionalUserId(c)
	if userID == nil {
		c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: 0})
		return
	}

	loc := h.resolveLocation(c)
	streak := h.vocabularyService.CalculateStreak(c.Request.Context(), *userID, loc)
	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: streak})
}

func (h *DictionaryHandler) GetDictionaryStats(c *gin.Context) {
	userID := h.getOptionalUserId(c)
	if userID == nil {
		c.JSON(http.StatusOK, dto.ApiResponse{
			Status: "success",
			Data: &dto.DictionaryStatsDto{
				WeekDays: []bool{false, false, false, false, false, false, false},
			},
		})
		return
	}

	loc := h.resolveLocation(c)
	stats, err := h.vocabularyService.GetDictionaryStats(c.Request.Context(), *userID, loc)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: stats})
}

func (h *DictionaryHandler) DeleteWord(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	wordIDStr := c.Param("id")
	wordID, err := strconv.ParseInt(wordIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: "Invalid wordId"})
		return
	}

	if err := h.vocabularyService.DeleteWord(c.Request.Context(), userID, wordID); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Message: "Item deleted"})
}

func (h *DictionaryHandler) DeleteResource(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	name, err := url.PathUnescape(c.Param("name"))
	if err != nil {
		name = c.Param("name")
	}
	if name == "" {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: "Resource name is required"})
		return
	}

	if err := h.vocabularyService.DeleteResource(c.Request.Context(), userID, name); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Message: "Resource deleted"})
}


