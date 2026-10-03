// Package router provides HTTP routing configuration.
package router

import (
	"github.com/gin-gonic/gin"
	"github.com/substreamedu/wordstream-iam-service/internal/handler"
	"github.com/substreamedu/wordstream-iam-service/internal/middleware"
	"github.com/substreamedu/wordstream-iam-service/internal/service"
	"go.uber.org/zap"
)

// Router holds all handlers and configures routes.
type Router struct {
	authHandler   *handler.AuthHandler
	userHandler   *handler.UserHandler
	adminHandler  *handler.AdminHandler
	healthHandler *handler.HealthHandler
	promoHandler  *handler.PromoHandler
	jwtService    *service.JWTService
	logger        *zap.Logger
}

// New creates a new Router.
func New(
	authHandler *handler.AuthHandler,
	userHandler *handler.UserHandler,
	adminHandler *handler.AdminHandler,
	healthHandler *handler.HealthHandler,
	promoHandler *handler.PromoHandler,
	jwtService *service.JWTService,
	logger *zap.Logger,
) *Router {
	return &Router{
		authHandler:   authHandler,
		userHandler:   userHandler,
		adminHandler:  adminHandler,
		healthHandler: healthHandler,
		promoHandler:  promoHandler,
		jwtService:    jwtService,
		logger:        logger,
	}
}

// Setup configures Gin router with all routes.
func (r *Router) Setup() *gin.Engine {
	// Set Gin mode
	gin.SetMode(gin.ReleaseMode)

	engine := gin.New()

	// Global middleware
	engine.Use(middleware.RequestID())
	engine.Use(middleware.Recovery(r.logger))
	engine.Use(middleware.Logger(r.logger))
	// engine.Use(middleware.CORS())

	// API group with context path matching Java service
	api := engine.Group("/auth-service")
	{
		// Auth endpoints
		auth := api.Group("/auth")
		{
			auth.POST("/login", r.authHandler.Login)
			auth.POST("/verify", r.authHandler.Verify)
			auth.POST("/google", r.authHandler.GoogleAuth)
			auth.GET("/internal/user/by-telegram-token/:token", r.authHandler.GetUserByTelegramToken)
			
			// Promo code endpoint (requires authentication)
			auth.POST("/promo", middleware.AuthMiddleware(r.jwtService), r.promoHandler.ApplyPromo)
		}

		// User endpoints
		users := api.Group("/users")
		{
			users.GET("/:userId", r.userHandler.GetUserDetails)
		}

		// Admin endpoints
		admin := api.Group("/admin")
		admin.Use(middleware.AuthMiddleware(r.jwtService))
		admin.Use(middleware.AdminMiddleware())
		{
			admin.GET("/users", r.adminHandler.ListUsers)
			admin.PATCH("/users/:userId", r.adminHandler.UpdateUser)
		}

		// Actuator endpoints (Spring Boot compatible)
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
