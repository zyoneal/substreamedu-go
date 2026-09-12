package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestGetUserId_Security(t *testing.T) {
	h := &MediaHandler{}

	t.Run("JWT context overrides spoofed query param and header", func(t *testing.T) {
		authenticatedUID := uuid.New()
		attackerUID := uuid.New()

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("GET", "/subtitles?userId="+attackerUID.String(), nil)
		c.Request.Header.Set("X-User-Id", attackerUID.String())
		c.Set("userID", authenticatedUID)

		uid, ok := h.getUserId(c)
		assert.True(t, ok)
		assert.Equal(t, authenticatedUID, uid, "Must return authenticated user ID from JWT context, ignoring spoofed userId")
	})

	t.Run("JWT context with string UUID overrides spoofed query param", func(t *testing.T) {
		authenticatedUID := uuid.New()
		attackerUID := uuid.New()

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("GET", "/subtitles?userId="+attackerUID.String(), nil)
		c.Set("userID", authenticatedUID.String())

		uid, ok := h.getUserId(c)
		assert.True(t, ok)
		assert.Equal(t, authenticatedUID, uid)
	})

	t.Run("Fallback to X-User-Id header when unauthenticated", func(t *testing.T) {
		validUID := uuid.New()

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("GET", "/subtitles", nil)
		c.Request.Header.Set("X-User-Id", validUID.String())

		uid, ok := h.getUserId(c)
		assert.True(t, ok)
		assert.Equal(t, validUID, uid)
	})

	t.Run("Missing user ID returns false and 400", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("GET", "/subtitles", nil)

		uid, ok := h.getUserId(c)
		assert.False(t, ok)
		assert.Equal(t, uuid.Nil, uid)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestUploadSubtitles_SizeLimits(t *testing.T) {
	h := &MediaHandler{}

	t.Run("Missing file returns 400", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("userID", uuid.New())
		c.Request, _ = http.NewRequest("POST", "/subtitles/upload", nil)
		c.Request.Header.Set("Content-Type", "multipart/form-data")

		h.UploadSubtitles(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestGetYoutubeClip_Validation(t *testing.T) {
	h := &MediaHandler{}

	t.Run("Empty videoId returns 400", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("GET", "/youtube/clip/", nil)

		h.GetYoutubeClip(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}


