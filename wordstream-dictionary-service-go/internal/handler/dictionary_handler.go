package handler

import (
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time" // Added for timing logs

	// Added for parallel execution
	json "github.com/goccy/go-json" // FAANG Optimization: 10x faster JSON decoding
	"go.uber.org/zap"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/substreamedu/wordstream-dictionary-service/internal/dto"
	"github.com/substreamedu/wordstream-dictionary-service/internal/service"
)

type DictionaryHandler struct {
	vocabularyService  *service.VocabularyService
	learningService    *service.LearningService
	aiService          *service.AIService
	nounProjectService *service.NounProjectService
}

func NewDictionaryHandler(vs *service.VocabularyService, ls *service.LearningService, as *service.AIService, nps *service.NounProjectService) *DictionaryHandler {
	return &DictionaryHandler{
		vocabularyService:  vs,
		learningService:    ls,
		aiService:          as,
		nounProjectService: nps,
	}
}

func (h *DictionaryHandler) getUserId(c *gin.Context) (uuid.UUID, bool) {
	userIDStr := c.Query("userId")
	if userIDStr == "" {
		userIDStr = c.Request.Header.Get("X-User-Id")
	}

	if userIDStr == "" || userIDStr == "undefined" || userIDStr == "null" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid userId"})
		return uuid.Nil, false
	}

	uid, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid userId format"})
		return uuid.Nil, false
	}
	return uid, true
}

func (h *DictionaryHandler) AddWord(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	var req dto.AddWordRequestDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	res, err := h.vocabularyService.AddWord(c.Request.Context(), userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, dto.ApiResponse{Status: "success", Data: res})
}

func (h *DictionaryHandler) GetDailyCards(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	res, err := h.learningService.GetDailyCards(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Message: "Session refreshed"})
}

func (h *DictionaryHandler) ReviewCard(c *gin.Context) {
	cardIDStr := c.Param("id")
	cardID, err := strconv.ParseInt(cardIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cardId"})
		return
	}

	var req dto.ReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	res, err := h.learningService.ReviewCard(c.Request.Context(), cardID, req.Rating, req.ResponseTimeMs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, res) // Response fits {card: ..., repeatInSession: ...} format directly
}
func (h *DictionaryHandler) GetAllLexemes(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	res, err := h.vocabularyService.GetAllLexemes(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: res})
}

// GetAllLexemesLight returns minimal data for fast subtitle word highlighting.
// This endpoint is ~10x faster than GetAllLexemes.
func (h *DictionaryHandler) GetAllLexemesLight(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	res, err := h.vocabularyService.GetAllLexemesLight(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	// FAANG Keyset Pagination: Parse optional cursor and limit
	cursor := int64(0)
	if cursorStr := c.Query("cursor"); cursorStr != "" {
		if parsed, err := strconv.ParseInt(cursorStr, 10, 64); err == nil {
			cursor = parsed
		}
	}

	limit := 50 // Default page size
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	start := time.Now()
	res, err := h.vocabularyService.GetLexemesByResourcePaginated(c.Request.Context(), userID, name, cursor, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: res})
}

func (h *DictionaryHandler) GetRandomWord(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}
	res, _ := h.vocabularyService.GetAllLexemes(c.Request.Context(), userID)
	if len(res) > 0 {
		// Pick a truly random word
		randomIndex := time.Now().UnixNano() % int64(len(res))
		c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: res[randomIndex]})
		return
	}
	c.JSON(http.StatusNotFound, dto.ApiResponse{Status: "error", Message: "no words found"})
}

func (h *DictionaryHandler) GetStreak(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	streak := h.vocabularyService.CalculateStreak(c.Request.Context(), userID)
	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: streak})
}

func (h *DictionaryHandler) GetDictionaryStats(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	stats, err := h.vocabularyService.GetDictionaryStats(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiResponse{Status: "error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: stats})
}

func (h *DictionaryHandler) GetTranslationProd(c *gin.Context) {
	var req dto.DictionaryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startTotal := time.Now()

	// 1. Fetch AI Translation (Required for context)
	result, provider, transErr := h.aiService.TranslateWithContext(c.Request.Context(), req)
	if transErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": transErr.Error()})
		return
	}

	// Set header to indicate which AI provider completed the translation
	c.Header("X-Translation-Provider", provider)

	if logger, ok := c.Get("logger"); ok {
		logger.(*zap.Logger).Info("AI Translation completed", 
			zap.String("provider", provider),
			zap.Duration("duration", time.Since(startTotal)))
	}

	// 2. Parse AI JSON Response
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
		// Fallback for malformed JSON
		if strings.HasPrefix(strings.TrimSpace(result), "{") {
			response = dto.TranslationProdResponse{Translation: "Error parsing AI response."}
		} else {
			response = dto.TranslationProdResponse{Translation: result}
		}
	} else {
		// Map new nested fields for backward compatibility
		h.mapCompatibilityFields(&response)
	}

	// 3. Sequential Icon Fetch based on accurate contextual keywords
	searchWord := response.VisualKeyword
	if searchWord == "" {
		searchWord = response.Definition
		// Clean the definition: strip anything in parentheses (e.g. Russian translations or extra notes)
		if idx := strings.Index(searchWord, "("); idx != -1 {
			searchWord = strings.TrimSpace(searchWord[:idx])
		}
	}
	if searchWord == "" {
		searchWord = req.HighlightedText
	}

	iconStart := time.Now()
	imageUrl, iconErr := h.nounProjectService.GetIcon(c.Request.Context(), searchWord)

	// Fallback to literal highlighted text if primary search returned no image
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

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: response})
}

// mapCompatibilityFields handles mapping nested AI fields to legacy fields for frontend compatibility.
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
}

func (h *DictionaryHandler) GenerateTextByLevel(c *gin.Context) {
	var req dto.GenerateTextRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.aiService.GenerateTextByLevel(c.Request.Context(), req.CefrLevel, req.Language, req.Topic)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: result})
}

func (h *DictionaryHandler) GenerateCohesiveText(c *gin.Context) {
	var req dto.GenerateCohesiveTextRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.aiService.GenerateCohesiveText(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: result})
}

func (h *DictionaryHandler) GenerateQuestions(c *gin.Context) {
	var req dto.GenerateCohesiveTextRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.aiService.GenerateQuestions(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Data: result})
}

func (h *DictionaryHandler) GenerateSessionSummary(c *gin.Context) {
	var req dto.SessionSummaryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.aiService.GenerateSessionSummary(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid wordId"})
		return
	}

	if err := h.vocabularyService.DeleteWord(c.Request.Context(), userID, wordID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Resource name is required"})
		return
	}

	if err := h.vocabularyService.DeleteResource(c.Request.Context(), userID, name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ApiResponse{Status: "success", Message: "Resource deleted"})
}

func (h *DictionaryHandler) ExportCsv(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	csvData, err := h.vocabularyService.ExportDictionaryAsCsv(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Disposition", "attachment; filename=dictionary.csv")
	c.Data(http.StatusOK, "application/octet-stream", csvData)
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
	csvData, err := h.vocabularyService.ExportResourceAsCsv(c.Request.Context(), userID, name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Disposition", "attachment; filename=dictionary_"+name+".csv")
	c.Data(http.StatusOK, "application/octet-stream", csvData)
}
func (h *DictionaryHandler) ExportAnki(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	ankiData, err := h.vocabularyService.ExportDictionaryAsAnki(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
	ankiData, err := h.vocabularyService.ExportResourceAsAnki(c.Request.Context(), userID, name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Disposition", "attachment; filename=dictionary_"+name+".apkg")
	c.Data(http.StatusOK, "application/octet-stream", ankiData)
}
