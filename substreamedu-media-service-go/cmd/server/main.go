package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"


	"github.com/gin-contrib/pprof"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/substreamedu/substreamedu-media-service/internal/client"
	"github.com/substreamedu/substreamedu-media-service/internal/config"
	"github.com/substreamedu/substreamedu-media-service/internal/handler"
	"github.com/substreamedu/substreamedu-media-service/internal/middleware"
	"github.com/substreamedu/substreamedu-media-service/internal/repository"
	"github.com/substreamedu/substreamedu-media-service/internal/router"
	"github.com/substreamedu/substreamedu-media-service/internal/service"
	"github.com/substreamedu/substreamedu-media-service/internal/telemetry"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

func main() {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	cfg := config.Load()

	shutdown := telemetry.InitTracing("media-service", cfg.OTLPEndpoint)
	defer shutdown(context.Background())

	poolConfig, err := pgxpool.ParseConfig(cfg.Database.DSN())
	if err != nil {
		logger.Fatal("Failed to parse database config", zap.Error(err))
	}

	poolConfig.MaxConns = 10
	poolConfig.MinConns = 2

	var dbPool *pgxpool.Pool
	maxRetries := 5
	for i := 0; i < maxRetries; i++ {
		dbPool, err = pgxpool.NewWithConfig(context.Background(), poolConfig)
		if err == nil {
			err = dbPool.Ping(context.Background())
			if err == nil {
				break
			}
		}
		logger.Warn("Failed to connect to database, retrying...", zap.Int("attempt", i+1), zap.Error(err))
		time.Sleep(3 * time.Second)
	}

	if err != nil {
		logger.Fatal("Failed to connect to database after retries", zap.Error(err))
	}
	defer dbPool.Close()

	if err := repository.RunMigrations(cfg.Database.DSN(), logger); err != nil {
		logger.Fatal("Failed to run database migrations", zap.Error(err))
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:		cfg.Redis.Addr,
		Password:	cfg.Redis.Password,
		DB:		cfg.Redis.DB,
	})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		logger.Warn("Redis unavailable, running without cache", zap.Error(err))
		rdb = nil
	}
	if rdb != nil {
		defer rdb.Close()
	}

	ytClient, err := client.NewYouTubeClient(&cfg.YouTube, logger)
	if err != nil {
		logger.Fatal("Failed to create youtube client", zap.Error(err))
	}
	spotifyClient := client.NewSpotifyClient(&cfg.Spotify, logger)
	subDLClient := client.NewSubDLClient(&cfg.SubDL, logger)
	deepSeekClient := client.NewDeepSeekClient(&cfg.DeepSeek, logger)
	transcriptClient := client.NewYouTubeTranscriptClient(logger)

	subtitleRepo := repository.NewSubtitleRepository(dbPool)

	ytService := service.NewYouTubeService(ytClient, logger)
	musicService := service.NewMusicService(spotifyClient, logger)
	subtitleService := service.NewSubtitleService(subtitleRepo, transcriptClient, rdb, logger)
	externalSubtitleService := service.NewExternalSubtitleService(subDLClient, logger)
	aiService := service.NewAiMediaService(deepSeekClient, logger)
	lyricsService := service.NewLyricsService(logger)

	mediaHandler := handler.NewMediaHandler(ytService, musicService, subtitleService, externalSubtitleService, aiService, lyricsService)
	adminHandler := handler.NewAdminHandler(subtitleService)
	healthHandler := handler.NewHealthHandler(dbPool, rdb)

	r := gin.New()

	r.Use(middleware.ValidateContentType())
	r.Use(middleware.Tracing("media-service"))
	r.Use(middleware.Logger(logger))
	r.Use(middleware.MaxBodySize(1 << 20))
	r.Use(middleware.RateLimit(middleware.NewRateLimiter(600, time.Minute)))
	r.Use(gin.Recovery())
	if os.Getenv("ENABLE_PPROF") == "true" {
		pprof.Register(r, "/media-service/debug/pprof")
	}
	router.Setup(r, cfg.Server.ContextPath, mediaHandler, adminHandler, healthHandler, cfg.JWTSecret)

	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			healthHandler.RegisterPoolMetrics("media-service")
			healthHandler.RegisterRedisMetrics("media-service")
		}
	}()

	srv := &http.Server{
		Addr:		":" + cfg.Server.Port,
		Handler:	r,
	}

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
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown:", zap.Error(err))
	}

	logger.Info("Server exiting")
}
