package handler

import (
	"errors"
	"net/http"
	"net/url"

	"github.com/gin-gonic/gin"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/service"
	"go.uber.org/zap"
)

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
