package handler

import (
	"io"
	"net/http"
	"regexp"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-media-service/internal/dto"
	"github.com/substreamedu/substreamedu-media-service/internal/service"
)

var ytVideoIDRegex = regexp.MustCompile(`^[a-zA-Z0-9_][a-zA-Z0-9_-]{10}$`)
var extSubtitleIDRegex = regexp.MustCompile(`^[a-zA-Z0-9_][a-zA-Z0-9_-]{0,63}$`)

type MediaHandler struct {
	youtubeService		*service.YouTubeService
	musicService		*service.MusicService
	subtitleService		*service.SubtitleService
	externalSubtitleService	*service.ExternalSubtitleService
	aiMediaService		*service.AiMediaService
	lyricsService		*service.LyricsService
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
		youtubeService:			yt,
		musicService:			ms,
		subtitleService:		ss,
		externalSubtitleService:	es,
		aiMediaService:			ai,
		lyricsService:			ls,
	}
}

func (h *MediaHandler) respondError(c *gin.Context, code int, message string) {
	c.JSON(code, dto.ApiResponse{
		Success:	false,
		Message:	message,
		Timestamp:	time.Now(),
	})
}

func (h *MediaHandler) respondSuccess(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, dto.ApiResponse{
		Success:	true,
		Data:		data,
		Timestamp:	time.Now(),
	})
}

func (h *MediaHandler) getUserId(c *gin.Context) (uuid.UUID, bool) {
	// SECURITY: userId must come exclusively from verified JWT claims.
	// Never trust client-supplied X-User-Id headers or ?userId= query params.
	if authIDVal, exists := c.Get("userID"); exists {
		if uid, ok := authIDVal.(uuid.UUID); ok && uid != uuid.Nil {
			return uid, true
		}
		if uidStr, ok := authIDVal.(string); ok && uidStr != "" {
			if uid, err := uuid.Parse(uidStr); err == nil {
				return uid, true
			}
		}
	}

	h.respondError(c, http.StatusUnauthorized, "Authentication required")
	return uuid.Nil, false
}

func (h *MediaHandler) getOptionalUserId(c *gin.Context) *uuid.UUID {
	// SECURITY: userId must come exclusively from verified JWT claims.
	if authIDVal, exists := c.Get("userID"); exists {
		if uid, ok := authIDVal.(uuid.UUID); ok && uid != uuid.Nil {
			return &uid
		}
		if uidStr, ok := authIDVal.(string); ok && uidStr != "" {
			if uid, err := uuid.Parse(uidStr); err == nil {
				return &uid
			}
		}
	}
	return nil
}

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
	if !ytVideoIDRegex.MatchString(videoID) {
		h.respondError(c, http.StatusBadRequest, "invalid videoId format: must be 11-character YouTube video ID")
		return
	}
	video, err := h.youtubeService.GetVideoInfo(c.Request.Context(), videoID)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondSuccess(c, video)
}

func (h *MediaHandler) GetYoutubeVideoInfo(c *gin.Context) {
	videoID := c.Query("videoId")
	if videoID == "" || !ytVideoIDRegex.MatchString(videoID) {
		h.respondError(c, http.StatusBadRequest, "videoId is required and must be 11-character YouTube video ID")
		return
	}
	video, err := h.youtubeService.GetVideoInfo(c.Request.Context(), videoID)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondSuccess(c, video)
}

func (h *MediaHandler) GetYoutubeClip(c *gin.Context) {
	videoID := c.Param("videoId")
	if !ytVideoIDRegex.MatchString(videoID) {
		h.respondError(c, http.StatusBadRequest, "invalid videoId format: must be 11-character YouTube video ID")
		return
	}

	startSec, errStart := strconv.ParseFloat(c.DefaultQuery("start", "0"), 64)
	endSec, errEnd := strconv.ParseFloat(c.DefaultQuery("end", "10"), 64)
	if errStart != nil || errEnd != nil || startSec < 0 || endSec <= startSec || (endSec-startSec) > 60 {
		h.respondError(c, http.StatusBadRequest, "invalid clip range: start must be >= 0, end > start, and maximum clip length is 60 seconds")
		return
	}

	filePath, err := h.youtubeService.GetClip(c.Request.Context(), videoID, startSec, endSec)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
	c.Header("Access-Control-Allow-Headers", "Range, Origin, Content-Type, Accept")
	c.Header("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges")
	c.Header("Cache-Control", "public, max-age=86400")
	c.Header("Content-Type", "video/mp4")
	http.ServeFile(c.Writer, c.Request, filePath)
}

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

const maxSubtitleUploadSize = 5 * 1024 * 1024 // 5MB

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

	if file.Size > maxSubtitleUploadSize {
		h.respondError(c, http.StatusRequestEntityTooLarge, "file too large, maximum size is 5MB")
		return
	}

	f, err := file.Open()
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer f.Close()

	limitedReader := io.LimitReader(f, maxSubtitleUploadSize+1)
	buf, err := io.ReadAll(limitedReader)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, "failed to read subtitle file")
		return
	}

	if int64(len(buf)) > maxSubtitleUploadSize {
		h.respondError(c, http.StatusRequestEntityTooLarge, "file too large, maximum size is 5MB")
		return
	}

	err = h.subtitleService.UploadSubtitles(c.Request.Context(), userID, file.Filename, string(buf))
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondSuccess(c, gin.H{"message": "subtitles uploaded successfully"})
}

func (h *MediaHandler) GetAllSubtitles(c *gin.Context) {
	uid := h.getOptionalUserId(c)
	if uid == nil {
		h.respondSuccess(c, []dto.SubtitleDto{})
		return
	}

	res, err := h.subtitleService.GetAll(c.Request.Context(), *uid)
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
	uid := h.getOptionalUserId(c)
	if uid == nil {
		h.respondSuccess(c, []dto.SubtitleResponseDto{})
		return
	}

	name := c.Param("name")
	res, err := h.subtitleService.GetSubtitlesForVideo(c.Request.Context(), *uid, name)
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
	if !ytVideoIDRegex.MatchString(videoID) {
		h.respondError(c, http.StatusBadRequest, "invalid videoId format: must be 11-character YouTube video ID")
		return
	}
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

	var yearPtr *int
	if y := c.Query("year"); y != "" {
		val, _ := strconv.Atoi(y)
		if val > 1900 {
			yearPtr = &val
		}
	}

	res, err := h.externalSubtitleService.SearchSubtitles(c.Request.Context(), filmName, languages, filmType, season, episode, yearPtr, imdbIdPtr, tmdbIdPtr, sdIdPtr)
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
	if !extSubtitleIDRegex.MatchString(subtitleID) {
		h.respondError(c, http.StatusBadRequest, "invalid subtitle ID format: must be alphanumeric")
		return
	}
	data, err := h.externalSubtitleService.DownloadSubtitle(c.Request.Context(), subtitleID)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.Header("Content-Disposition", "attachment; filename="+subtitleID+".zip")
	c.Data(http.StatusOK, "application/zip", data)
}
