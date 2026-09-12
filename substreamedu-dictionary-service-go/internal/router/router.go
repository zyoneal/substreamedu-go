package router

import (
	"github.com/gin-contrib/requestid"
	"github.com/gin-gonic/gin"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/handler"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/middleware"
	ginprometheus "github.com/zsais/go-gin-prometheus"
	"go.uber.org/zap"
)

func Setup(r *gin.Engine, contextPath string, dh *handler.DictionaryHandler, ah *handler.AdminHandler, hh *handler.HealthHandler, logger *zap.Logger, jwtSecret string, rateLimiter *middleware.RateLimiter) {

	r.Use(middleware.MaxBodySize(1 << 20))
	r.Use(middleware.ValidateContentType())
	r.Use(requestid.New())
	r.Use(middleware.Tracing("dictionary-service"))
	r.Use(middleware.Logging(logger))
	r.Use(gin.Recovery())

	p := ginprometheus.NewPrometheus("gin")
	p.MetricsPath = contextPath + "/actuator/prometheus"
	p.Use(r)

	root := r.Group(contextPath)
	{
		root.Use(middleware.RateLimit(rateLimiter))
		root.Use(middleware.OptionalAuthMiddleware(jwtSecret))

		root.POST("/subtitles/generate-text", dh.GenerateTextByLevel)

		api := root.Group("/dictionary")
		{

			api.POST("/translation/prod", dh.GetTranslationProd)

			api.GET("/resources", dh.GetAllGroups)
			api.GET("/resources/items", dh.GetAllLexemes)
			api.GET("/resources/items/light", dh.GetAllLexemesLight)
			api.GET("/resources/:name/items", dh.GetByResource)
			api.GET("/export/csv", dh.ExportCsv)
			api.GET("/export/anki", dh.ExportAnki)
			api.GET("/resources/:name/export/csv", dh.ExportResourceCsv)
			api.GET("/resources/:name/export/anki", dh.ExportResourceAnki)

			api.GET("/srs/today", dh.GetDailyCards)
			api.GET("/srs/stats", dh.GetDictionaryStats)

			api.GET("/random", dh.GetRandomWord)
			api.GET("/streak", dh.GetStreak)
			api.POST("/generate-text", dh.GenerateTextByLevel)
			api.POST("/generate-cohesive", dh.GenerateCohesiveText)
			api.POST("/generate-questions", dh.GenerateQuestions)
			api.POST("/session-summary", dh.GenerateSessionSummary)

			// Mutations require strict JWT authentication
			mutations := api.Group("")
			mutations.Use(middleware.AuthMiddleware(jwtSecret))
			{
				mutations.POST("/translated", dh.AddWord)
				mutations.DELETE("/resources/:name/items/:id", dh.DeleteWord)
				mutations.DELETE("/resources/:name", dh.DeleteResource)
				mutations.POST("/srs/today/refresh", dh.RefreshSRS)
				mutations.POST("/item/:id/review2", dh.ReviewCard)
			}

			admin := api.Group("/admin")

			admin.Use(middleware.AuthMiddleware(jwtSecret))
			admin.Use(middleware.AdminMiddleware())
			{
				admin.GET("/users/top-words", ah.GetTopUsers)
				admin.GET("/users/:userId/overview", ah.GetUserOverview)
				admin.POST("/users/:userId/reset-srs", ah.ResetSRSProgress)
				admin.POST("/reset-srs-global", ah.ResetSRSProgressGlobal)
			}
		}

		actuator := root.Group("/actuator")
		{
			actuator.Match([]string{"GET", "HEAD"}, "/health", hh.Readiness)
			actuator.Match([]string{"GET", "HEAD"}, "/health/liveness", hh.Liveness)
			actuator.Match([]string{"GET", "HEAD"}, "/health/readiness", hh.Readiness)
			actuator.GET("/info", hh.Info)
		}
	}
}
