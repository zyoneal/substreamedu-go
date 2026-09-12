package router

import (
	"time"

	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/pprof"
	"github.com/gin-gonic/gin"
	"github.com/substreamedu/substreamedu-iam-service/internal/handler"
	"github.com/substreamedu/substreamedu-iam-service/internal/middleware"
	"github.com/substreamedu/substreamedu-iam-service/internal/service"
	"go.uber.org/zap"
)

type Router struct {
	authHandler	*handler.AuthHandler
	userHandler	*handler.UserHandler
	adminHandler	*handler.AdminHandler
	healthHandler	*handler.HealthHandler
	promoHandler	*handler.PromoHandler
	usageHandler	*handler.UsageHandler
	jwtService	*service.JWTService
	authLimiter	*middleware.RateLimiter
	logger		*zap.Logger
}

func New(
	authHandler *handler.AuthHandler,
	userHandler *handler.UserHandler,
	adminHandler *handler.AdminHandler,
	healthHandler *handler.HealthHandler,
	promoHandler *handler.PromoHandler,
	usageHandler *handler.UsageHandler,
	jwtService *service.JWTService,
	logger *zap.Logger,
) *Router {
	return &Router{
		authHandler:	authHandler,
		userHandler:	userHandler,
		adminHandler:	adminHandler,
		healthHandler:	healthHandler,
		promoHandler:	promoHandler,
		usageHandler:	usageHandler,
		jwtService:	jwtService,
		authLimiter:	middleware.NewRateLimiter(10, time.Minute),
		logger:		logger,
	}
}

func (r *Router) Setup() *gin.Engine {

	gin.SetMode(gin.ReleaseMode)

	engine := gin.New()

	engine.Use(gzip.Gzip(gzip.DefaultCompression))
	engine.Use(middleware.RequestID())
	engine.Use(middleware.MaxBodySize(1 << 20))
	engine.Use(middleware.ValidateContentType())
	engine.Use(middleware.Tracing("iam-service"))
	engine.Use(middleware.Recovery(r.logger))
	engine.Use(middleware.Logger(r.logger))

	pprof.Register(engine, "/auth-service/debug/pprof")

	api := engine.Group("/auth-service")
	{

		auth := api.Group("/auth")
		auth.Use(middleware.RateLimit(r.authLimiter))
		{
			auth.POST("/login", r.authHandler.Login)
			auth.POST("/verify", r.authHandler.Verify)
			auth.POST("/google", r.authHandler.GoogleAuth)
			auth.GET("/internal/user/by-telegram-token/:token", r.authHandler.GetUserByTelegramToken)

			auth.POST("/promo", middleware.AuthMiddleware(r.jwtService), r.promoHandler.ApplyPromo)
		}

		users := api.Group("/users")
		users.Use(middleware.AuthMiddleware(r.jwtService))
		{
			users.GET("/:userId", r.userHandler.GetUserDetails)
		}

		admin := api.Group("/admin")
		admin.Use(middleware.AuthMiddleware(r.jwtService))
		admin.Use(middleware.AdminMiddleware())
		{
			admin.GET("/users", r.adminHandler.ListUsers)
			admin.PATCH("/users/:userId", r.adminHandler.UpdateUser)
		}

		internal := api.Group("/auth/internal")
		{
			internal.GET("/user/:userId/usage", r.usageHandler.GetUsage)
			internal.POST("/user/:userId/usage/increment", r.usageHandler.IncrementUsage)
		}

		actuator := api.Group("/actuator")
		{
			actuator.Match([]string{"GET", "HEAD"}, "/health", r.healthHandler.Health)
			actuator.GET("/info", r.healthHandler.Info)
			actuator.GET("/metrics", r.healthHandler.Metrics)
			actuator.GET("/prometheus", r.healthHandler.Prometheus())
		}
	}

	return engine
}
