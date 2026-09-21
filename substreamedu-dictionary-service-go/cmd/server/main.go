package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	_ "time/tzdata"


	"github.com/gin-contrib/pprof"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/segmentio/kafka-go"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/client"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/config"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/handler"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/middleware"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/repository"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/router"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/service"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/service/fsrs"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/telemetry"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
)

func main() {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	cfg := config.Load()

	shutdownTracing := telemetry.InitTracing("dictionary-service", cfg.OTLPEndpoint)
	defer func() {
		if err := shutdownTracing(context.Background()); err != nil {
			logger.Error("Failed to shutdown tracing", zap.Error(err))
		}
	}()

	poolConfig, err := pgxpool.ParseConfig(cfg.Database.DSN())
	if err != nil {
		logger.Fatal("Failed to parse database config", zap.Error(err))
	}

	poolConfig.MaxConns = 100
	poolConfig.MinConns = 10

	dbPool, err := pgxpool.NewWithConfig(context.Background(), poolConfig)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer dbPool.Close()

	if err := repository.RunMigrations(cfg.Database.DSN(), logger); err != nil {
		logger.Fatal("Failed to run database migrations", zap.Error(err))
	}

	kafkaWriter := &kafka.Writer{
		Addr:		kafka.TCP(cfg.Kafka.BootstrapServers),
		Balancer:	&kafka.LeastBytes{},
	}
	defer kafkaWriter.Close()

	dictRepo := repository.NewDictionaryRepository(dbPool)
	outboxRepo := repository.NewOutboxRepository(dbPool)

	fsrsEngine := fsrs.NewEngine(fsrs.RealClock{})
	outboxService := service.NewOutboxService(outboxRepo, logger)

	rdb := service.NewRedisClient(cfg.Redis.Addr, cfg.Redis.Password, cfg.Redis.DB)
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		logger.Warn("Redis unavailable at startup, will reconnect automatically", zap.Error(err))
	}
	defer rdb.Close()

	aiService := service.NewAIService(cfg.DeepSeek.APIKey, cfg.Groq.APIKey, cfg.Gemini.APIKey, rdb, logger)
	learningService := service.NewLearningService(dictRepo, outboxService, fsrsEngine, dbPool, rdb, aiService, logger)
	vocabularyService := service.NewVocabularyService(dictRepo, learningService, rdb, aiService, logger)
	nounProjectService := service.NewNounProjectService(cfg.NounProject.APIKey, cfg.NounProject.APISecret, cfg.Pixabay.APIKey, logger)

	iamClient := client.NewIAMClient(cfg.IAMServiceURL, cfg.InternalServiceKey, logger)

	outboxProcessor := service.NewOutboxProcessor(outboxRepo, kafkaWriter, logger)
	lessonRepo := repository.NewLessonRepository(dbPool)

	dictHandler := handler.NewDictionaryHandler(vocabularyService, learningService, aiService, nounProjectService, iamClient, lessonRepo)

	adminHandler := handler.NewAdminHandler(vocabularyService)

	healthHandler := handler.NewHealthHandler(dbPool, rdb)

	startupCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := dbPool.Ping(startupCtx); err != nil {
		logger.Warn("Postgres reachable check failed", zap.Error(err))
	} else {
		logger.Info("Postgres reached successfully")
	}

	if rdb != nil {
		if err := rdb.Ping(startupCtx).Err(); err != nil {
			logger.Warn("Redis ping failed", zap.Error(err))
		} else {
			logger.Info("Redis reached successfully")
		}
	} else {
		logger.Warn("Redis not available, skipping connectivity check")
	}

	r := gin.New()

	if os.Getenv("ENABLE_PPROF") == "true" {
		pprof.Register(r, "/dictionary-service/debug/pprof")
	}
	rateLimiter := middleware.NewRateLimiter(600, time.Minute)
	router.Setup(r, cfg.Server.ContextPath, dictHandler, adminHandler, healthHandler, logger, cfg.JWT.SecretKey, cfg.InternalServiceKey, rateLimiter)

	srv := &http.Server{
		Addr:		":" + cfg.Server.Port,
		Handler:	r,
		ReadTimeout:	120 * time.Second,
		WriteTimeout:	120 * time.Second,
		IdleTimeout:	120 * time.Second,
	}

	backgroundCtx, backgroundCancel := context.WithCancel(context.Background())

	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			healthHandler.RegisterPoolMetrics("dictionary-service")
			healthHandler.RegisterRedisMetrics("dictionary-service")
		}
	}()

	g, gCtx := errgroup.WithContext(backgroundCtx)
	g.Go(func() error {
		outboxProcessor.Start(gCtx)
		return nil
	})

	go func() {
		logger.Info("Starting server", zap.String("port", cfg.Server.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("listen: %s\n", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")
	backgroundCancel()

	if err := g.Wait(); err != nil {
		logger.Warn("Background task exited with error", zap.Error(err))
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown:", zap.Error(err))
	}

	logger.Info("Server exiting")
}
