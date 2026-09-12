package router

import (
	"github.com/gin-gonic/gin"
	"github.com/substreamedu/substreamedu-media-service/internal/handler"
	"github.com/substreamedu/substreamedu-media-service/internal/middleware"
)

func Setup(r *gin.Engine, contextPath string, mediaHandler *handler.MediaHandler, adminHandler *handler.AdminHandler, healthHandler *handler.HealthHandler, jwtSecret string) {
	root := r.Group(contextPath)
	{
		root.Use(middleware.OptionalAuthMiddleware(jwtSecret))

		youtube := root.Group("/youtube")
		{
			youtube.GET("/search", mediaHandler.SearchYoutube)
			youtube.GET("/video/:videoId", mediaHandler.GetYoutubeVideo)
			youtube.GET("/info", mediaHandler.GetYoutubeVideoInfo)
			youtube.GET("/clip/:videoId", mediaHandler.GetYoutubeClip)
		}

		subtitles := root.Group("/subtitles")
		{
			subtitles.GET("", mediaHandler.GetAllSubtitles)
			subtitles.GET("/:name", mediaHandler.GetSubtitles)
			subtitles.GET("/video/:name", mediaHandler.GetSubtitlesForVideo)
			subtitles.GET("/youtube/:videoId", mediaHandler.GetSubtitlesForYoutubeVideo)

			subtitles.GET("/external/search", mediaHandler.SearchExternalSubtitles)
			subtitles.GET("/external/download/:id", mediaHandler.DownloadExternalSubtitle)

			// Mutation routes require authentication
			authenticatedSubs := subtitles.Group("")
			authenticatedSubs.Use(middleware.AuthMiddleware(jwtSecret))
			{
				authenticatedSubs.POST("/upload", mediaHandler.UploadSubtitles)
				authenticatedSubs.DELETE("/:name", mediaHandler.DeleteSubtitle)
			}

			admin := subtitles.Group("/admin")
			admin.Use(middleware.AuthMiddleware(jwtSecret))
			{
				admin.GET("/users/:userId/media-stats", adminHandler.GetUserMediaStats)
			}
		}

		root.GET("/music/search", mediaHandler.SearchMusic)

		root.GET("/lyrics", mediaHandler.GetLyrics)

		// AI generation requires authenticated user
		authenticatedRoot := root.Group("")
		authenticatedRoot.Use(middleware.AuthMiddleware(jwtSecret))
		{
			authenticatedRoot.POST("/ai/generate", mediaHandler.GenerateAiText)
		}

		actuator := root.Group("/actuator")
		{
			actuator.Match([]string{"GET", "HEAD"}, "/health", healthHandler.Health)
			actuator.GET("/info", healthHandler.Info)
			actuator.GET("/prometheus", healthHandler.Prometheus())
		}
	}
}
