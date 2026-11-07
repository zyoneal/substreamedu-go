package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/model"
)

// CategorizeWordsBatch handles high-throughput categorization of user vocabulary in micro-batches
func (h *DictionaryHandler) CategorizeWordsBatch(c *gin.Context) {
	if h.categorizationService == nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: "Categorization service not initialized"})
		return
	}

	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	var req dto.CategorizeBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req.Limit = 100
	}
	if req.Limit <= 0 {
		req.Limit = 100
	}

	resp, err := h.categorizationService.CategorizeUserVocabularyBatch(c.Request.Context(), userID, req.Limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: resp})
}

// GetVocabularyCategories returns category groups with counts for the user
func (h *DictionaryHandler) GetVocabularyCategories(c *gin.Context) {
	if h.categorizationService == nil {
		c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: []model.CategoryGroup{}})
		return
	}

	userID := h.getOptionalUserId(c)
	if userID == nil {
		c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: []model.CategoryGroup{}})
		return
	}

	categories, err := h.categorizationService.GetVocabularyCategories(c.Request.Context(), *userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}
	if categories == nil {
		categories = []model.CategoryGroup{}
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: categories})
}

// GetLexemesByCategory returns paginated items filtered by category
func (h *DictionaryHandler) GetLexemesByCategory(c *gin.Context) {
	if h.categorizationService == nil {
		c.JSON(http.StatusOK, dto.ApiResponse{
			Status: "success",
			Data: gin.H{
				"items":   []dto.DictionaryItemDto{},
				"hasMore": false,
			},
		})
		return
	}

	userID := h.getOptionalUserId(c)
	if userID == nil {
		c.JSON(http.StatusOK, dto.ApiResponse{
			Status: "success",
			Data: gin.H{
				"items":   []dto.DictionaryItemDto{},
				"hasMore": false,
			},
		})
		return
	}

	category := c.Param("category")
	cursorStr := c.DefaultQuery("cursor", "0")
	limitStr := c.DefaultQuery("limit", "50")

	cursor, _ := strconv.ParseInt(cursorStr, 10, 64)
	limit, _ := strconv.Atoi(limitStr)

	lexemes, hasMore, err := h.categorizationService.GetLexemesByCategory(c.Request.Context(), *userID, category, cursor, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	items := make([]dto.DictionaryItemDto, 0, len(lexemes))
	for _, m := range lexemes {
		items = append(items, dto.DictionaryItemDto{
			ID:              m.ID,
			UserID:          m.UserID,
			HighlightedText: m.Word,
			TranslatedText:  m.Translation,
			Transcription:   m.Transcription,
			Context:         m.Context,
			ResourceName:    m.Source,
			Status:          m.Status,
			DifficultyScore: m.DifficultyScore,
			Definition:      m.Definition,
			ImageUrl:        m.ImageUrl,
			Stability:       m.Stability,
			Retrievability:  m.Retrievability,
			CardType:        m.CardType,
			Category:        m.Category,
		})
	}

	c.JSON(http.StatusOK, dto.ApiResponse{
		Status: "success",
		Data: gin.H{
			"items":   items,
			"hasMore": hasMore,
		},
	})
}
