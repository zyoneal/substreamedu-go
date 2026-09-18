package handler

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	json "github.com/goccy/go-json"
	"go.uber.org/zap"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/client"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/model"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/service"
)

const (
	translationLimit   = 100
	savedWordsLimit    = 50
	maxAnkiExportCards = 2500
)

type DictionaryHandler struct {
	vocabularyService  *service.VocabularyService
	learningService    *service.LearningService
	aiService          *service.AIService
	nounProjectService *service.NounProjectService
	iamClient          *client.IAMClient
}

func NewDictionaryHandler(vs *service.VocabularyService, ls *service.LearningService, as *service.AIService, nps *service.NounProjectService, ic *client.IAMClient) *DictionaryHandler {
	return &DictionaryHandler{
		vocabularyService:	vs,
		learningService:	ls,
		aiService:		as,
		nounProjectService:	nps,
		iamClient:		ic,
	}
}

func (h *DictionaryHandler) getUserId(c *gin.Context) (uuid.UUID, bool) {
	if authIDVal, exists := c.Get("userID"); exists {
		if authIDStr, ok := authIDVal.(string); ok && authIDStr != "" {
			if uid, err := uuid.Parse(authIDStr); err == nil {
				return uid, true
			}
		}
	}

	userIDStr := c.Query("userId")
	if userIDStr == "" {
		userIDStr = c.Request.Header.Get("X-User-Id")
	}

	if userIDStr == "" || userIDStr == "undefined" || userIDStr == "null" {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: "Invalid userId"})
		return uuid.Nil, false
	}

	uid, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: "Invalid userId format"})
		return uuid.Nil, false
	}
	return uid, true
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
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	loc := h.resolveLocation(c)
	res, err := h.learningService.GetDailyCards(c.Request.Context(), userID, loc)
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
	userID, ok := h.getUserId(c)
	if !ok {
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

	res, err := h.vocabularyService.GetAllLexemesPaginated(c.Request.Context(), userID, cursor, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: res})
}

func (h *DictionaryHandler) GetAllLexemesLight(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
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

	res, err := h.vocabularyService.GetAllLexemesLightPaginated(c.Request.Context(), userID, cursor, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: res})
}

func (h *DictionaryHandler) GetByResource(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
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
	res, err := h.vocabularyService.GetLexemesByResourcePaginated(c.Request.Context(), userID, name, cursor, limit)
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
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	res, err := h.vocabularyService.GetVocabularyGroups(c.Request.Context(), userID)
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
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	loc := h.resolveLocation(c)
	streak := h.vocabularyService.CalculateStreak(c.Request.Context(), userID, loc)
	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: streak})
}

func (h *DictionaryHandler) GetDictionaryStats(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	loc := h.resolveLocation(c)
	stats, err := h.vocabularyService.GetDictionaryStats(c.Request.Context(), userID, loc)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: stats})
}

func (h *DictionaryHandler) GetTranslationProd(c *gin.Context) {
	var req dto.DictionaryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	if userID, ok := c.Get("userID"); ok {
		if uid, err := uuid.Parse(userID.(string)); err == nil {
			if !h.checkLimit(c, uid, "translation") {
				return
			}
		}
	}

	startTotal := time.Now()

	result, provider, transErr := h.aiService.TranslateWithContext(c.Request.Context(), req)
	if transErr != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: transErr.Error()})
		return
	}

	c.Header("X-Translation-Provider", provider)

	if logger, ok := c.Get("logger"); ok {
		logger.(*zap.Logger).Info("AI Translation completed",
			zap.String("provider", provider),
			zap.Duration("duration", time.Since(startTotal)))
	}

	startIdx := strings.Index(result, "{")
	endIdx := strings.LastIndex(result, "}")

	jsonToParse := ""
	if startIdx != -1 && endIdx != -1 && endIdx > startIdx {
		jsonToParse = result[startIdx : endIdx+1]
	} else {
		jsonToParse = strings.TrimSpace(result)
	}

	var response dto.TranslationProdResponse
	if err := json.Unmarshal([]byte(jsonToParse), &response); err != nil {

		if strings.HasPrefix(strings.TrimSpace(result), "{") {
			response = dto.TranslationProdResponse{Translation: "Error parsing AI response."}
		} else {
			response = dto.TranslationProdResponse{Translation: result}
		}
	} else {

		h.mapCompatibilityFields(&response)
	}

	searchWord := response.VisualKeyword
	if searchWord == "" {
		searchWord = response.Definition

		if idx := strings.Index(searchWord, "("); idx != -1 {
			searchWord = strings.TrimSpace(searchWord[:idx])
		}
	}
	if searchWord == "" {
		searchWord = req.HighlightedText
	}

	iconStart := time.Now()
	imageUrl, iconErr := h.nounProjectService.GetIcon(c.Request.Context(), searchWord)

	if (iconErr != nil || imageUrl == "") && searchWord != req.HighlightedText {
		if logger, ok := c.Get("logger"); ok {
			logger.(*zap.Logger).Info("Primary search returned no image, trying highlighted text", zap.String("fallback", req.HighlightedText))
		}
		imageUrl, iconErr = h.nounProjectService.GetIcon(c.Request.Context(), req.HighlightedText)
	}

	if logger, ok := c.Get("logger"); ok {
		logger.(*zap.Logger).Info("Icon fetch completed", zap.Duration("duration", time.Since(iconStart)))
	}

	if iconErr != nil {
		if logger, ok := c.Get("logger"); ok {
			logger.(*zap.Logger).Warn("Icon fetch failed", zap.Error(iconErr), zap.String("word", searchWord))
		}
	}
	response.ImageUrl = imageUrl

	if userID, ok := c.Get("userID"); ok {
		if uid, err := uuid.Parse(userID.(string)); err == nil && h.iamClient != nil {
			var log *zap.Logger
			if l, ok := c.Get("logger"); ok {
				log = l.(*zap.Logger)
			}
			go func() {
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()
				if err := h.iamClient.IncrementUsage(ctx, uid, "translation"); err != nil && log != nil {
					log.Warn("Failed to increment translation usage", zap.Error(err))
				}
			}()
		}
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: response})
}

func (h *DictionaryHandler) mapCompatibilityFields(response *dto.TranslationProdResponse) {
	if response.Translation == "" {
		if response.Linguistic.Lemma != "" {
			response.Translation = response.Linguistic.Lemma
		} else if response.Meta.ErrorCode != "" {
			response.Translation = "[" + response.Meta.ErrorCode + "]"
		}
	}

	if response.Transcription == "" {
		if response.Pronunciation.IPA != "" {
			response.Transcription = response.Pronunciation.IPA
		} else if response.IPA != "" {
			response.Transcription = response.IPA
		}
	}

	if response.IPA == "" && response.Pronunciation.IPA != "" {
		response.IPA = response.Pronunciation.IPA
	}

	if response.PartOfSpeech == "" && response.Linguistic.POS != "" {
		response.PartOfSpeech = response.Linguistic.POS
	}

	if len(response.RecommendedSelections) == 0 {
		if len(response.ContextAnalysis.Collocations) > 0 {
			response.RecommendedSelections = response.ContextAnalysis.Collocations
		} else if len(response.Alternatives) > 0 {
			for _, alt := range response.Alternatives {
				response.RecommendedSelections = append(response.RecommendedSelections, alt.Text)
			}
		}
	}

	// Fallback: populate register from style if LLM only returned style
	if response.Register == "" && response.Style != "" {
		response.Register = response.Style
	}

	// Promote context_analysis.collocations into top-level chunks when chunks is empty
	if len(response.Chunks) == 0 && len(response.ContextAnalysis.Collocations) > 0 {
		response.Chunks = response.ContextAnalysis.Collocations
	}
}

func (h *DictionaryHandler) GenerateTextByLevel(c *gin.Context) {
	var req dto.GenerateTextRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	result, err := h.aiService.GenerateTextByLevel(ctx, req.CefrLevel, req.Language, req.Topic)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
			c.JSON(http.StatusGatewayTimeout, dto.ApiResponse{
				Status:  "error",
				Message: "AI generation timed out after 15 seconds. Please try again with shorter content.",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: result})
}

func (h *DictionaryHandler) GenerateCohesiveText(c *gin.Context) {
	var req dto.GenerateCohesiveTextRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	result, err := h.aiService.GenerateCohesiveText(ctx, req)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
			c.JSON(http.StatusGatewayTimeout, dto.ApiResponse{
				Status:  "error",
				Message: "AI generation timed out after 15 seconds. Please try again with shorter content.",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: result})
}

func (h *DictionaryHandler) GenerateQuestions(c *gin.Context) {
	var req dto.GenerateCohesiveTextRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	result, err := h.aiService.GenerateQuestions(ctx, req)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
			c.JSON(http.StatusGatewayTimeout, dto.ApiResponse{
				Status:  "error",
				Message: "AI generation timed out after 15 seconds. Please try again with shorter content.",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: result})
}

func (h *DictionaryHandler) GenerateSessionSummary(c *gin.Context) {
	var req dto.SessionSummaryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	result, err := h.aiService.GenerateSessionSummary(ctx, req)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
			c.JSON(http.StatusGatewayTimeout, dto.ApiResponse{
				Status:  "error",
				Message: "AI generation timed out after 15 seconds. Please try again with shorter content.",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: result})
}

func (h *DictionaryHandler) GeneratePracticeExercises(c *gin.Context) {
	var req dto.PracticeExercisesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	result, err := h.aiService.GeneratePracticeExercises(ctx, req)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
			c.JSON(http.StatusGatewayTimeout, dto.ApiResponse{
				Status:  "error",
				Message: "Practice exercise generation timed out after 15 seconds.",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: result})
}

func (h *DictionaryHandler) EvaluateSentence(c *gin.Context) {
	var req dto.EvaluateSentenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	result, err := h.aiService.EvaluateSentence(ctx, req)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
			c.JSON(http.StatusGatewayTimeout, dto.ApiResponse{
				Status:  "error",
				Message: "Sentence evaluation timed out after 15 seconds.",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: result})
}

func (h *DictionaryHandler) AnalyzeGrammar(c *gin.Context) {
	var req dto.AnalyzeGrammarRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	result, err := h.aiService.AnalyzeGrammar(ctx, req)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
			c.JSON(http.StatusGatewayTimeout, dto.ApiResponse{
				Status:  "error",
				Message: "Grammar analysis timed out after 15 seconds.",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: result})
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

func (h *DictionaryHandler) ExportCsv(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=dictionary.csv")
	c.Status(http.StatusOK)

	if err := h.vocabularyService.StreamDictionaryAsCsv(c.Request.Context(), userID, c.Writer); err != nil {
		if logger, ok := c.Get("logger"); ok {
			logger.(*zap.Logger).Error("Failed to stream CSV export", zap.Error(err))
		}
	}
}

func (h *DictionaryHandler) ExportResourceCsv(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	name, err := url.PathUnescape(c.Param("name"))
	if err != nil {
		name = c.Param("name")
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=dictionary_"+name+".csv")
	c.Status(http.StatusOK)

	if err := h.vocabularyService.StreamResourceAsCsv(c.Request.Context(), userID, name, c.Writer); err != nil {
		if logger, ok := c.Get("logger"); ok {
			logger.(*zap.Logger).Error("Failed to stream resource CSV export", zap.Error(err))
		}
	}
}

func (h *DictionaryHandler) ExportAnki(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	ankiData, err := h.vocabularyService.ExportDictionaryAsAnki(c.Request.Context(), userID, maxAnkiExportCards)
	if err != nil {
		if errors.Is(err, service.ErrExportLimitExceeded) {
			c.JSON(http.StatusBadRequest, dto.ApiResponse{
				Status:  "error",
				Message: "Dictionary contains more than 2,500 words. Please export individual resources or collections to prevent browser timeout.",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.Header("Content-Disposition", "attachment; filename=dictionary.apkg")
	c.Data(http.StatusOK, "application/octet-stream", ankiData)
}

func (h *DictionaryHandler) ExportResourceAnki(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	name, err := url.PathUnescape(c.Param("name"))
	if err != nil {
		name = c.Param("name")
	}
	ankiData, err := h.vocabularyService.ExportResourceAsAnki(c.Request.Context(), userID, name, maxAnkiExportCards)
	if err != nil {
		if errors.Is(err, service.ErrExportLimitExceeded) {
			c.JSON(http.StatusBadRequest, dto.ApiResponse{
				Status:  "error",
				Message: "Resource contains more than 2,500 words. Please export a smaller subset.",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.Header("Content-Disposition", "attachment; filename=dictionary_"+name+".apkg")
	c.Data(http.StatusOK, "application/octet-stream", ankiData)
}
