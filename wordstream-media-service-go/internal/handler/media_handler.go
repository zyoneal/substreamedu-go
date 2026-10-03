package handler

import (
	"net/http"
	"strconv"

	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/substreamedu/wordstream-media-service/internal/dto"
	"github.com/substreamedu/wordstream-media-service/internal/service"
)

type MediaHandler struct {
	youtubeService          *service.YouTubeService
	musicService            *service.MusicService
	subtitleService         *service.SubtitleService
	externalSubtitleService *service.ExternalSubtitleService
	aiMediaService          *service.AiMediaService
	lyricsService           *service.LyricsService
}

func NewMediaHandler(
	yt *service.YouTubeService,
	ms *service.MusicService,
	ss *service.SubtitleService,
	es *service.ExternalSubtitleService,
	ai *service.AiMediaService,
	ls *service.LyricsService,
) *MediaHandler {
	return &MediaHandler{
		youtubeService:          yt,
		musicService:            ms,
		subtitleService:         ss,
		externalSubtitleService: es,
		aiMediaService:          ai,
		lyricsService:           ls,
	}
}

func (h *MediaHandler) respondError(c *gin.Context, code int, message string) {
	c.JSON(code, dto.ApiResponse{
		Success:   false,
		Message:   message,
		Timestamp: time.Now(),
	})
}

func (h *MediaHandler) respondSuccess(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, dto.ApiResponse{
		Success:   true,
		Data:      data,
		Timestamp: time.Now(),
	})
}

func (h *MediaHandler) getUserId(c *gin.Context) (uuid.UUID, bool) {
	userIDStr := c.Request.Header.Get("X-User-Id")
	if userIDStr == "" {
		userIDStr = c.Query("userId")
	}

	if userIDStr == "" || userIDStr == "undefined" || userIDStr == "null" {
		h.respondError(c, http.StatusBadRequest, "Invalid userId")
		return uuid.Nil, false
	}

	uid, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid userId format")
		return uuid.Nil, false
	}
	return uid, true
}

// YouTube handlers
func (h *MediaHandler) SearchYoutube(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		h.respondError(c, http.StatusBadRequest, "query is required")
		return
	}

	videos, err := h.youtubeService.SearchVideos(c.Request.Context(), query)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	if videos == nil {
		videos = []dto.YoutubeVideoDto{}
	}
	h.respondSuccess(c, videos)
}

func (h *MediaHandler) GetYoutubeVideo(c *gin.Context) {
	videoID := c.Param("videoId")
	video, err := h.youtubeService.GetVideoInfo(c.Request.Context(), videoID)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondSuccess(c, video)
}

func (h *MediaHandler) GetYoutubeVideoInfo(c *gin.Context) {
	videoID := c.Query("videoId")
	if videoID == "" {
		h.respondError(c, http.StatusBadRequest, "videoId is required")
		return
	}
	video, err := h.youtubeService.GetVideoInfo(c.Request.Context(), videoID)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondSuccess(c, video)
}

// Music handlers
func (h *MediaHandler) SearchMusic(c *gin.Context) {
	query := c.Query("q")
	tracks, err := h.musicService.SearchTracks(c.Request.Context(), query)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	if tracks == nil {
		tracks = []dto.MusicTrackDto{}
	}
	h.respondSuccess(c, tracks)
}

func (h *MediaHandler) GetSubtitles(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}
	name := c.Param("name")
	texts, err := h.subtitleService.GetSubtitles(c.Request.Context(), userID, name)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	if texts == nil {
		texts = []string{}
	}
	h.respondSuccess(c, texts)
}

// AI handlers
func (h *MediaHandler) GenerateAiText(c *gin.Context) {
	var req dto.GenerateTextRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondError(c, http.StatusBadRequest, err.Error())
		return
	}
	text, err := h.aiMediaService.GenerateEducationalText(c.Request.Context(), req)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondSuccess(c, gin.H{"text": text})
}

// Lyrics handlers
func (h *MediaHandler) GetLyrics(c *gin.Context) {
	artist := c.Query("artist")
	title := c.Query("title")
	res, _ := h.lyricsService.GetLyrics(c.Request.Context(), artist, title)
	if res == nil {
		h.respondError(c, http.StatusNotFound, "lyrics not found")
		return
	}
	h.respondSuccess(c, res)
}

// Subtitle handlers extensions
func (h *MediaHandler) UploadSubtitles(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		h.respondError(c, http.StatusBadRequest, "file is required")
		return
	}

	f, err := file.Open()
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer f.Close()

	// Read content
	buf := make([]byte, file.Size)
	f.Read(buf)

	err = h.subtitleService.UploadSubtitles(c.Request.Context(), userID, file.Filename, string(buf))
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondSuccess(c, gin.H{"message": "subtitles uploaded successfully"})
}

func (h *MediaHandler) GetAllSubtitles(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}

	res, err := h.subtitleService.GetAll(c.Request.Context(), userID)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	if res == nil {
		res = []dto.SubtitleDto{}
	}
	h.respondSuccess(c, res)
}

func (h *MediaHandler) DeleteSubtitle(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}
	name := c.Param("name")
	h.subtitleService.DeleteByUserIdAndName(c.Request.Context(), userID, name)
	c.Status(http.StatusNoContent)
}

func (h *MediaHandler) GetSubtitlesForVideo(c *gin.Context) {
	userID, ok := h.getUserId(c)
	if !ok {
		return
	}
	name := c.Param("name")
	res, err := h.subtitleService.GetSubtitlesForVideo(c.Request.Context(), userID, name)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	if res == nil {
		res = []dto.SubtitleResponseDto{}
	}
	h.respondSuccess(c, res)
}

func (h *MediaHandler) GetSubtitlesForYoutubeVideo(c *gin.Context) {
	videoID := c.Param("videoId")
	res, err := h.subtitleService.GetSubtitlesForYoutubeVideo(c.Request.Context(), videoID)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	if res == nil {
		res = []dto.SubtitleResponseDto{}
	}
	h.respondSuccess(c, res)
}

func (h *MediaHandler) SearchExternalSubtitles(c *gin.Context) {
	filmName := c.Query("filmName")
	languages := c.Query("languages")
	filmType := c.Query("type")
	imdbId := c.Query("imdbId")
	tmdbId := c.Query("tmdbId")

	if languages == "" {
		languages = "EN"
	}
	if filmType == "" {
		filmType = "movie"
	}

	var season, episode *int
	if s := c.Query("seasonNumber"); s != "" {
		val, _ := strconv.Atoi(s)
		season = &val
	}
	if e := c.Query("episodeNumber"); e != "" {
		val, _ := strconv.Atoi(e)
		episode = &val
	}

	// Convert to pointers for optional params
	var imdbIdPtr, tmdbIdPtr *string
	if imdbId != "" {
		imdbIdPtr = &imdbId
	}
	if tmdbId != "" {
		tmdbIdPtr = &tmdbId
	}

	var sdIdPtr *int
	if s := c.Query("sdId"); s != "" {
		val, _ := strconv.Atoi(s)
		sdIdPtr = &val
	}

	res, err := h.externalSubtitleService.SearchSubtitles(c.Request.Context(), filmName, languages, filmType, season, episode, imdbIdPtr, tmdbIdPtr, sdIdPtr)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, "Failed to search external subtitles")
		return
	}
	if res == nil {
		res = &dto.SubtitleSearchResponse{Subtitles: []dto.SubtitleItem{}, Results: []dto.SearchResult{}}
	}
	h.respondSuccess(c, res)
}

func (h *MediaHandler) DownloadExternalSubtitle(c *gin.Context) {
	subtitleID := c.Param("id")
	data, err := h.externalSubtitleService.DownloadSubtitle(c.Request.Context(), subtitleID)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.Header("Content-Disposition", "attachment; filename="+subtitleID+".zip")
	c.Data(http.StatusOK, "application/zip", data)
}
