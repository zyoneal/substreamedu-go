package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"


	"github.com/gin-contrib/pprof"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/substreamedu/substreamedu-notification-service/internal/bot"
	"github.com/substreamedu/substreamedu-notification-service/internal/client"
	"github.com/substreamedu/substreamedu-notification-service/internal/config"
	"github.com/substreamedu/substreamedu-notification-service/internal/dto"
	"github.com/substreamedu/substreamedu-notification-service/internal/handler"
	"github.com/substreamedu/substreamedu-notification-service/internal/kafka"
	"github.com/substreamedu/substreamedu-notification-service/internal/middleware"
	"github.com/substreamedu/substreamedu-notification-service/internal/repository"
	"github.com/substreamedu/substreamedu-notification-service/internal/service"
	"github.com/substreamedu/substreamedu-notification-service/internal/telemetry"
)

func main() {

	logger := initLogger()
	defer logger.Sync()

	logger.Info("Starting Notification Service", zap.String("version", "1.0.0"))

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cfg := config.Load()

	shutdown := telemetry.InitTracing(logger, "notification-service", cfg.OTLPEndpoint)
	defer shutdown(context.Background())

	pool, err := initDatabase(ctx, cfg, logger)
	if err != nil {
		logger.Fatal("Failed to initialize database", zap.Error(err))
	}
	defer pool.Close()

	if err := repository.RunMigrations(cfg.Database.DSN(), logger); err != nil {
		logger.Fatal("Failed to run database migrations", zap.Error(err))
	}

	telegramRepo := repository.NewTelegramUserRepository(pool)
	sessionRepo := repository.NewSessionRepository(pool)

	iamClient := client.NewIAMClient(&cfg.Services, logger)
	dictClient := client.NewDictionaryClient(&cfg.Services, logger)

	producer := kafka.NewProducer(&cfg.Kafka, logger)
	defer producer.Close()

	botService := service.NewBotService(iamClient, dictClient, producer, logger)

	botStarted := make(chan struct{}, 1)
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			default:
			}

			telegramBot, err := bot.New(&cfg.Telegram, botService, telegramRepo, sessionRepo, logger)
			if err == nil {
				logger.Info("Telegram bot initialized successfully")
				botStarted <- struct{}{}

				go telegramBot.Start(ctx)
				return
			}

			logger.Warn("Failed to create Telegram bot, retrying in 10s...", zap.Error(err))

			select {
			case <-ctx.Done():
				return
			case <-time.After(10 * time.Second):
			}
		}
	}()

	select {
	case <-botStarted:
		logger.Info("Telegram bot readiness confirmed")
	case <-time.After(30 * time.Second):
		logger.Warn("Telegram bot not yet initialized after 30s, continuing (will retry in background)")
	default:
	}

	consumer := kafka.NewConsumer(&cfg.Kafka, logger, func(event *dto.WordReviewedEvent) {
		logger.Info("Processing word reviewed event",
			zap.String("userId", event.UserID.String()),
			zap.Int64("wordId", event.WordID),
		)
	})

	consumer.Start(ctx)

	gin.SetMode(gin.ReleaseMode)
	router := gin.New()

	pprof.Register(router, "/notification-service/debug/pprof")
	router.Use(middleware.Tracing("notification-service"), middleware.MaxBodySize(1<<20), middleware.ValidateContentType(), middleware.Logger(logger), gin.Recovery())

	healthHandler := handler.NewHealthHandler(pool)

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
		Addr:		":" + cfg.Server.Port,
		Handler:	router,
		ReadTimeout:	15 * time.Second,
		WriteTimeout:	15 * time.Second,
	}

	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			healthHandler.RegisterPoolMetrics("notification-service")
		}
	}()

	go func() {
		logger.Info("HTTP server starting",
			zap.String("port", cfg.Server.Port),
			zap.String("contextPath", cfg.Server.ContextPath),
		)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("HTTP server failed", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down...")

	cancel()

	time.Sleep(2 * time.Second)
	consumer.Close()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("Server shutdown error", zap.Error(err))
	}

	logger.Info("Notification service stopped gracefully")
}

func initLogger() *zap.Logger {
	config := zap.Config{
		Level:		zap.NewAtomicLevelAt(zap.InfoLevel),
		Development:	false,
		Encoding:	"json",
		EncoderConfig: zapcore.EncoderConfig{
			TimeKey:	"timestamp",
			LevelKey:	"level",
			NameKey:	"logger",
			CallerKey:	"caller",
			MessageKey:	"message",
			StacktraceKey:	"stacktrace",
			LineEnding:	zapcore.DefaultLineEnding,
			EncodeLevel:	zapcore.LowercaseLevelEncoder,
			EncodeTime:	zapcore.ISO8601TimeEncoder,
			EncodeDuration:	zapcore.MillisDurationEncoder,
			EncodeCaller:	zapcore.ShortCallerEncoder,
		},
		OutputPaths:		[]string{"stdout"},
		ErrorOutputPaths:	[]string{"stderr"},
	}

	logger, err := config.Build()
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize logger: %v", err))
	}

	return logger
}
