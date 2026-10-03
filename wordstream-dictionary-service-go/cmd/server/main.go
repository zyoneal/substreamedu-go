package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/segmentio/kafka-go"
	"github.com/substreamedu/wordstream-dictionary-service/internal/config"
	"github.com/substreamedu/wordstream-dictionary-service/internal/handler"
	"github.com/substreamedu/wordstream-dictionary-service/internal/repository"
	"github.com/substreamedu/wordstream-dictionary-service/internal/router"
	"github.com/substreamedu/wordstream-dictionary-service/internal/service"
	"github.com/substreamedu/wordstream-dictionary-service/internal/service/fsrs"
	"go.uber.org/zap"
)

func main() {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	cfg := config.Load()

	// DB
	poolConfig, err := pgxpool.ParseConfig(cfg.Database.DSN())
	if err != nil {
		logger.Fatal("Failed to parse database config", zap.Error(err))
	}
	// Reduced connection limits to prevent Postgres OOM (1GB limit)
	poolConfig.MaxConns = 15
	poolConfig.MinConns = 2

	dbPool, err := pgxpool.NewWithConfig(context.Background(), poolConfig)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer dbPool.Close()

	// Auto-migrations
	repository.InitSchema(dbPool, logger)

	// Kafka Writer for Outbox
	kafkaWriter := &kafka.Writer{
		Addr:     kafka.TCP(cfg.Kafka.BootstrapServers),
		Balancer: &kafka.LeastBytes{},
	}
	defer kafkaWriter.Close()

	// Repositories
	dictRepo := repository.NewDictionaryRepository(dbPool)
	outboxRepo := repository.NewOutboxRepository(dbPool)

	// Engines & Services
	fsrsEngine := fsrs.NewEngine()
	outboxService := service.NewOutboxService(outboxRepo, logger)

	// Redis
	rdb := service.NewRedisClient(cfg.Redis.Addr, cfg.Redis.Password, cfg.Redis.DB)
	defer rdb.Close()

	aiService := service.NewAIService(cfg.DeepSeek.APIKey, cfg.Groq.APIKey, cfg.Gemini.APIKey, rdb, logger)
	learningService := service.NewLearningService(dictRepo, outboxService, fsrsEngine, dbPool, rdb, aiService, logger)
	vocabularyService := service.NewVocabularyService(dictRepo, learningService, rdb, logger)
	nounProjectService := service.NewNounProjectService(cfg.NounProject.APIKey, cfg.NounProject.APISecret, cfg.Pixabay.APIKey, logger)

	outboxProcessor := service.NewOutboxProcessor(outboxRepo, kafkaWriter, logger)

	// Kafka Consumer for Reviews
	// Consumer disabled: The dictionary service should NOT consume its own review events.
	// This prevents infinite loops and race conditions.
	// reviewConsumer := ikafka.NewReviewConsumer(
	// 	[]string{cfg.Kafka.BootstrapServers},
	// 	cfg.Kafka.ReviewTopic,
	// 	cfg.Kafka.GroupID,
	// 	learningService,
	// 	logger,
	// )

	// Handlers
	dictHandler := handler.NewDictionaryHandler(vocabularyService, learningService, aiService, nounProjectService)
	adminHandler := handler.NewAdminHandler(vocabularyService)
	healthHandler := handler.NewHealthHandler() // Reuse from previous or implementation logic here

	// Startup Diagnostics
	startupCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := dbPool.Ping(startupCtx); err != nil {
		logger.Warn("Postgres reachable check failed", zap.Error(err))
	} else {
		logger.Info("Postgres reached successfully")
	}

	if err := rdb.Ping(startupCtx).Err(); err != nil {
		logger.Warn("Redis ping failed", zap.Error(err))
	} else {
		logger.Info("Redis reached successfully")
	}

	// Server
	r := gin.New()
	router.Setup(r, cfg.Server.ContextPath, dictHandler, adminHandler, healthHandler, logger)

	srv := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      r,
		ReadTimeout:  90 * time.Second, // FAANG Optimization: Accommodate heavy AI generation
		WriteTimeout: 90 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start Background Tasks
	go outboxProcessor.Start(context.Background())
	// go reviewConsumer.Start(context.Background())

	go func() {
		logger.Info("Starting server", zap.String("port", cfg.Server.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("listen: %s\n", zap.Error(err))
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown:", zap.Error(err))
	}

	logger.Info("Server exiting")
}
