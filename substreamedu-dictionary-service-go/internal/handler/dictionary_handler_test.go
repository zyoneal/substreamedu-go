package handler

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestAIGeneration_ValidationAndTimeout(t *testing.T) {
	h := &DictionaryHandler{}

	t.Run("GenerateTextByLevel returns 400 on invalid JSON", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("POST", "/generate-text", bytes.NewBufferString("invalid json"))
		c.Request.Header.Set("Content-Type", "application/json")

		h.GenerateTextByLevel(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("GenerateCohesiveText returns 400 on invalid JSON", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("POST", "/generate-cohesive", bytes.NewBufferString("invalid json"))
		c.Request.Header.Set("Content-Type", "application/json")

		h.GenerateCohesiveText(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("GenerateQuestions returns 400 on invalid JSON", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("POST", "/generate-questions", bytes.NewBufferString("invalid json"))
		c.Request.Header.Set("Content-Type", "application/json")

		h.GenerateQuestions(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("GenerateSessionSummary returns 400 on invalid JSON", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("POST", "/session-summary", bytes.NewBufferString("invalid json"))
		c.Request.Header.Set("Content-Type", "application/json")

		h.GenerateSessionSummary(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}
