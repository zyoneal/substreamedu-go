package router

import (
	"github.com/gin-gonic/gin"
	"github.com/substreamedu/wordstream-media-service/internal/handler"
)

func Setup(r *gin.Engine, contextPath string, mediaHandler *handler.MediaHandler, adminHandler *handler.AdminHandler, healthHandler *handler.HealthHandler) {
	root := r.Group(contextPath)
	{
		// YouTube
		youtube := root.Group("/youtube")
		{
			youtube.GET("/search", mediaHandler.SearchYoutube)
			youtube.GET("/video/:videoId", mediaHandler.GetYoutubeVideo)
			youtube.GET("/info", mediaHandler.GetYoutubeVideoInfo)
		}

		// Subtitles
		subtitles := root.Group("/subtitles")
		{
			subtitles.POST("/upload", mediaHandler.UploadSubtitles)
			subtitles.GET("", mediaHandler.GetAllSubtitles)
			subtitles.GET("/:name", mediaHandler.GetSubtitles) // Get text only
			subtitles.GET("/video/:name", mediaHandler.GetSubtitlesForVideo)
			subtitles.GET("/youtube/:videoId", mediaHandler.GetSubtitlesForYoutubeVideo)
			subtitles.DELETE("/:name", mediaHandler.DeleteSubtitle)

			// External Subtitles (SubDL)
			subtitles.GET("/external/search", mediaHandler.SearchExternalSubtitles)
			subtitles.GET("/external/download/:id", mediaHandler.DownloadExternalSubtitle)

			// Admin
			admin := subtitles.Group("/admin")
			{
				admin.GET("/users/:userId/media-stats", adminHandler.GetUserMediaStats)
			}
		}

		// Music
		root.GET("/music/search", mediaHandler.SearchMusic)

		// Lyrics
		root.GET("/lyrics", mediaHandler.GetLyrics)

		// AI
		root.POST("/ai/generate", mediaHandler.GenerateAiText)

		// Actuator
		actuator := root.Group("/actuator")
		{
			actuator.Match([]string{"GET", "HEAD"}, "/health", healthHandler.Health)
			actuator.GET("/info", healthHandler.Info)
			actuator.GET("/prometheus", healthHandler.Prometheus())
		}
	}
}
