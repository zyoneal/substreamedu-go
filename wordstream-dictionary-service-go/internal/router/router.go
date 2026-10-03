package router

import (
	"github.com/gin-contrib/requestid"
	"github.com/gin-gonic/gin"
	"github.com/substreamedu/wordstream-dictionary-service/internal/handler"
	"github.com/substreamedu/wordstream-dictionary-service/internal/middleware"
	ginprometheus "github.com/zsais/go-gin-prometheus"
	"go.uber.org/zap"
)

func Setup(r *gin.Engine, contextPath string, dh *handler.DictionaryHandler, ah *handler.AdminHandler, hh *handler.HealthHandler, logger *zap.Logger) {
	// FAANG Optimization: Global Observability Layer
	r.Use(requestid.New())
	r.Use(middleware.Logging(logger))
	r.Use(gin.Recovery())

	// Prometheus
	p := ginprometheus.NewPrometheus("gin")
	p.MetricsPath = contextPath + "/actuator/prometheus"
	p.Use(r)

	root := r.Group(contextPath)
	{
		// Alias for requests proxied from /api/subtitles in the gateway
		root.POST("/subtitles/generate-text", dh.GenerateTextByLevel)

		// Main dictionary group matching Java @RequestMapping("/dictionary")
		api := root.Group("/dictionary")
		{
			// Flat routes based on Java DictionaryController
			api.POST("/translated", dh.AddWord)
			api.POST("/translation/prod", dh.GetTranslationProd)

			api.GET("/resources", dh.GetAllGroups)
			api.GET("/resources/items", dh.GetAllLexemes)
			api.GET("/resources/items/light", dh.GetAllLexemesLight) // Fast endpoint for subtitle highlighting
			api.GET("/resources/:name/items", dh.GetByResource)
			api.DELETE("/resources/:name/items/:id", dh.DeleteWord)
			api.DELETE("/resources/:name", dh.DeleteResource)
			api.GET("/export/csv", dh.ExportCsv)
			api.GET("/export/anki", dh.ExportAnki)
			api.GET("/resources/:name/export/csv", dh.ExportResourceCsv)
			api.GET("/resources/:name/export/anki", dh.ExportResourceAnki)

			api.GET("/srs/today", dh.GetDailyCards)
			api.GET("/srs/stats", dh.GetDictionaryStats)
			api.POST("/srs/today/refresh", dh.RefreshSRS)
			api.POST("/item/:id/review2", dh.ReviewCard)

			api.GET("/random", dh.GetRandomWord)
			api.GET("/streak", dh.GetStreak)
			api.POST("/generate-text", dh.GenerateTextByLevel)
			api.POST("/generate-cohesive", dh.GenerateCohesiveText)
			api.POST("/generate-questions", dh.GenerateQuestions)
			api.POST("/session-summary", dh.GenerateSessionSummary)

			admin := api.Group("/admin")
			{
				admin.GET("/users/top-words", ah.GetTopUsers)
				admin.GET("/users/:userId/overview", ah.GetUserOverview)
				admin.POST("/users/:userId/reset-srs", ah.ResetSRSProgress)
				admin.POST("/reset-srs-global", ah.ResetSRSProgressGlobal)
			}
		}

		// Actuator
		actuator := root.Group("/actuator")
		{
			actuator.Match([]string{"GET", "HEAD"}, "/health", hh.Readiness)
			actuator.Match([]string{"GET", "HEAD"}, "/health/liveness", hh.Liveness)
			actuator.Match([]string{"GET", "HEAD"}, "/health/readiness", hh.Readiness)
			actuator.GET("/info", hh.Info)
		}
	}
}
