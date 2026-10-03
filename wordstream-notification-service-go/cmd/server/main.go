// Package main is the entry point for the Notification service.
package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/substreamedu/wordstream-notification-service/internal/bot"
	"github.com/substreamedu/wordstream-notification-service/internal/client"
	"github.com/substreamedu/wordstream-notification-service/internal/config"
	"github.com/substreamedu/wordstream-notification-service/internal/dto"
	"github.com/substreamedu/wordstream-notification-service/internal/handler"
	"github.com/substreamedu/wordstream-notification-service/internal/kafka"
	"github.com/substreamedu/wordstream-notification-service/internal/repository"
	"github.com/substreamedu/wordstream-notification-service/internal/service"
)

func main() {
	// Initialize logger
	logger := initLogger()
	defer logger.Sync()

	logger.Info("Starting Notification Service", zap.String("version", "1.0.0"))

	// Context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Load configuration
	cfg := config.Load()

	// Initialize database connection pool
	pool, err := initDatabase(ctx, cfg, logger)
	if err != nil {
		logger.Fatal("Failed to initialize database", zap.Error(err))
	}
	defer pool.Close()

	// Run migrations
	if err := repository.RunMigrations(pool, logger); err != nil {
		logger.Fatal("Failed to run database migrations", zap.Error(err))
	}

	// Initialize repository
	telegramRepo := repository.NewTelegramUserRepository(pool)

	// Initialize clients
	iamClient := client.NewIAMClient(&cfg.Services, logger)
	dictClient := client.NewDictionaryClient(&cfg.Services, logger)

	// Initialize Kafka producer
	producer := kafka.NewProducer(&cfg.Kafka, logger)
	defer producer.Close()

	// Initialize bot service
	botService := service.NewBotService(iamClient, dictClient, producer, logger)

	// Initialize Telegram bot asynchronously with retries
	var telegramBot *bot.TelegramBot
	go func() {
		for {
			var err error
			telegramBot, err = bot.New(&cfg.Telegram, botService, telegramRepo, logger)
			if err == nil {
				logger.Info("Telegram bot initialized successfully")

				// Start bot polling in another goroutine once created
				go telegramBot.Start(ctx)
				return
			}

			logger.Warn("Failed to create Telegram bot, retrying in 10s...", zap.Error(err))

			select {
			case <-ctx.Done():
				return
			case <-time.After(10 * time.Second):
				// retry
			}
		}
	}()

	// Initialize Kafka consumer
	consumer := kafka.NewConsumer(&cfg.Kafka, logger, func(event *dto.WordReviewedEvent) {
		logger.Info("Processing word reviewed event",
			zap.String("userId", event.UserID.String()),
			zap.Int64("wordId", event.WordID),
		)
	})

	// Context for graceful shutdown
	// Moved to top

	// Start Kafka consumer
	consumer.Start(ctx)
	defer consumer.Close()

	// Bot started asynchronously in the loop above

	// Setup HTTP server
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery())

	healthHandler := handler.NewHealthHandler()

	// Routes with context path
	api := router.Group(cfg.Server.ContextPath)
	{
		actuator := api.Group("/actuator")
		{
			actuator.Match([]string{"GET", "HEAD"}, "/health", healthHandler.Health)
			actuator.GET("/info", healthHandler.Info)
			actuator.GET("/prometheus", healthHandler.Prometheus())
		}
	}

	server := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	// Start HTTP server
	go func() {
		logger.Info("HTTP server starting",
			zap.String("port", cfg.Server.Port),
			zap.String("contextPath", cfg.Server.ContextPath),
		)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("HTTP server failed", zap.Error(err))
		}
	}()

	// Wait for shutdown signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down...")

	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("Server shutdown error", zap.Error(err))
	}

	logger.Info("Notification service stopped gracefully")
}

func initLogger() *zap.Logger {
	config := zap.Config{
		Level:       zap.NewAtomicLevelAt(zap.InfoLevel),
		Development: false,
		Encoding:    "json",
		EncoderConfig: zapcore.EncoderConfig{
			TimeKey:        "timestamp",
			LevelKey:       "level",
			NameKey:        "logger",
			CallerKey:      "caller",
			MessageKey:     "message",
			StacktraceKey:  "stacktrace",
			LineEnding:     zapcore.DefaultLineEnding,
			EncodeLevel:    zapcore.LowercaseLevelEncoder,
			EncodeTime:     zapcore.ISO8601TimeEncoder,
			EncodeDuration: zapcore.MillisDurationEncoder,
			EncodeCaller:   zapcore.ShortCallerEncoder,
		},
		OutputPaths:      []string{"stdout"},
		ErrorOutputPaths: []string{"stderr"},
	}

	logger, err := config.Build()
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize logger: %v", err))
	}

	return logger
}
