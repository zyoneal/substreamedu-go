package handler

import (
	"context"
	"net/http"
	"strings"
	"time"

	json "github.com/goccy/go-json"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
	"go.uber.org/zap"
)

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

	// Compatibility fallback for Hint: populate from RecommendedSelections[0]
	if response.Hint == "" && len(response.RecommendedSelections) > 0 {
		response.Hint = response.RecommendedSelections[0]
	}

	// Bi-directional compatibility fallback for Register and Style
	if response.Register == "" && response.Style != "" {
		response.Register = response.Style
	}
	if response.Style == "" && response.Register != "" {
		response.Style = response.Register
	}

	// Promote context_analysis.collocations into top-level chunks when chunks is empty
	if len(response.Chunks) == 0 && len(response.ContextAnalysis.Collocations) > 0 {
		response.Chunks = response.ContextAnalysis.Collocations
	}
}
