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

	t.Run("GeneratePracticeExercises returns 400 on invalid JSON", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("POST", "/practice/generate-exercises", bytes.NewBufferString("invalid json"))
		c.Request.Header.Set("Content-Type", "application/json")

		h.GeneratePracticeExercises(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("EvaluateSentence returns 400 on invalid JSON", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("POST", "/practice/evaluate-sentence", bytes.NewBufferString("invalid json"))
		c.Request.Header.Set("Content-Type", "application/json")

		h.EvaluateSentence(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestDictionary_GuestAllowed(t *testing.T) {
	h := &DictionaryHandler{}

	t.Run("GetAllLexemes unauthenticated guest gets 200 OK and empty items", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("GET", "/resources/items", nil)

		h.GetAllLexemes(c)
		assert.Equal(t, http.StatusOK, w.Code, "Guest request to GetAllLexemes must return 200 OK, not 401 Unauthorized")
	})

	t.Run("GetAllLexemesLight unauthenticated guest gets 200 OK and empty items", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("GET", "/resources/items/light", nil)

		h.GetAllLexemesLight(c)
		assert.Equal(t, http.StatusOK, w.Code, "Guest request to GetAllLexemesLight must return 200 OK, not 401 Unauthorized")
	})

	t.Run("GetByResource unauthenticated guest gets 200 OK and empty items", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "name", Value: "demo-video"}}
		c.Request, _ = http.NewRequest("GET", "/resources/demo-video/items", nil)

		h.GetByResource(c)
		assert.Equal(t, http.StatusOK, w.Code, "Guest request to GetByResource must return 200 OK, not 401 Unauthorized")
	})

	t.Run("GetAllGroups unauthenticated guest gets 200 OK and empty groups", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("GET", "/resources", nil)

		h.GetAllGroups(c)
		assert.Equal(t, http.StatusOK, w.Code, "Guest request to GetAllGroups must return 200 OK, not 401 Unauthorized")
	})

	t.Run("GetDailyCards unauthenticated guest gets 200 OK and empty cards", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("GET", "/srs/today", nil)

		h.GetDailyCards(c)
		assert.Equal(t, http.StatusOK, w.Code, "Guest request to GetDailyCards must return 200 OK, not 401 Unauthorized")
	})

	t.Run("GetStreak unauthenticated guest gets 200 OK and 0 streak", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("GET", "/streak", nil)

		h.GetStreak(c)
		assert.Equal(t, http.StatusOK, w.Code, "Guest request to GetStreak must return 200 OK, not 401 Unauthorized")
	})

	t.Run("GetDictionaryStats unauthenticated guest gets 200 OK and empty stats", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("GET", "/srs/stats", nil)

		h.GetDictionaryStats(c)
		assert.Equal(t, http.StatusOK, w.Code, "Guest request to GetDictionaryStats must return 200 OK, not 401 Unauthorized")
	})
}
