package handler

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
)

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
