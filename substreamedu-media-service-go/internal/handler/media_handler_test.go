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

	t.Run("Rejects X-User-Id header when unauthenticated to prevent IDOR", func(t *testing.T) {
		validUID := uuid.New()

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("GET", "/subtitles", nil)
		c.Request.Header.Set("X-User-Id", validUID.String())

		uid, ok := h.getUserId(c)
		assert.False(t, ok, "Must not trust X-User-Id header without verified JWT")
		assert.Equal(t, uuid.Nil, uid)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("Missing user ID returns false and 401", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("GET", "/subtitles", nil)

		uid, ok := h.getUserId(c)
		assert.False(t, ok)
		assert.Equal(t, uuid.Nil, uid)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
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

	t.Run("Path traversal in videoId returns 400", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "videoId", Value: "../../etc/p"}}
		c.Request, _ = http.NewRequest("GET", "/youtube/clip/../../etc/p", nil)

		h.GetYoutubeClip(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("CLI flag in videoId returns 400", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "videoId", Value: "--version12"}}
		c.Request, _ = http.NewRequest("GET", "/youtube/clip/--version12", nil)

		h.GetYoutubeClip(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Negative start time returns 400", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "videoId", Value: "dQw4w9WgXcQ"}}
		c.Request, _ = http.NewRequest("GET", "/youtube/clip/dQw4w9WgXcQ?start=-5&end=10", nil)

		h.GetYoutubeClip(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("End time less than or equal to start returns 400", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "videoId", Value: "dQw4w9WgXcQ"}}
		c.Request, _ = http.NewRequest("GET", "/youtube/clip/dQw4w9WgXcQ?start=10&end=5", nil)

		h.GetYoutubeClip(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Excessive clip duration returns 400 (DoS prevention)", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "videoId", Value: "dQw4w9WgXcQ"}}
		c.Request, _ = http.NewRequest("GET", "/youtube/clip/dQw4w9WgXcQ?start=0&end=3600", nil)

		h.GetYoutubeClip(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestGetYoutubeVideo_Validation(t *testing.T) {
	h := &MediaHandler{}

	t.Run("Malformed videoId returns 400", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "videoId", Value: "bad;rm -rf"}}
		c.Request, _ = http.NewRequest("GET", "/youtube/video/bad;rm -rf", nil)

		h.GetYoutubeVideo(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestGetYoutubeVideoInfo_Validation(t *testing.T) {
	h := &MediaHandler{}

	t.Run("Missing videoId query param returns 400", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("GET", "/youtube/info", nil)

		h.GetYoutubeVideoInfo(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Malformed videoId query param returns 400", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("GET", "/youtube/info?videoId=short", nil)

		h.GetYoutubeVideoInfo(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestDownloadExternalSubtitle_Validation(t *testing.T) {
	h := &MediaHandler{}

	t.Run("Invalid subtitle ID with CRLF returns 400", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "id", Value: "123\r\nSet-Cookie:admin=1"}}
		c.Request, _ = http.NewRequest("GET", "/subtitles/external/download/123", nil)

		h.DownloadExternalSubtitle(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestGetAllSubtitles_GuestAllowed(t *testing.T) {
	h := &MediaHandler{}

	t.Run("Unauthenticated guest user gets 200 OK and empty list", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("GET", "/subtitles", nil)

		h.GetAllSubtitles(c)
		assert.Equal(t, http.StatusOK, w.Code, "Guest request to GetAllSubtitles must return 200 OK, not 401 Unauthorized")
	})
}

func TestGetSubtitlesForVideo_GuestAllowed(t *testing.T) {
	h := &MediaHandler{}

	t.Run("Unauthenticated guest user gets 200 OK and empty list", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "name", Value: "demo-video"}}
		c.Request, _ = http.NewRequest("GET", "/subtitles/video/demo-video", nil)

		h.GetSubtitlesForVideo(c)
		assert.Equal(t, http.StatusOK, w.Code, "Guest request to GetSubtitlesForVideo must return 200 OK, not 401 Unauthorized")
	})
}
