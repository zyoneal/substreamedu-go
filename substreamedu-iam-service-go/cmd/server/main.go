package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/substreamedu/substreamedu-iam-service/internal/cache"
	"github.com/substreamedu/substreamedu-iam-service/internal/config"
	"github.com/substreamedu/substreamedu-iam-service/internal/handler"
	"github.com/substreamedu/substreamedu-iam-service/internal/repository"
	"github.com/substreamedu/substreamedu-iam-service/internal/router"
	"github.com/substreamedu/substreamedu-iam-service/internal/service"
	"github.com/substreamedu/substreamedu-iam-service/internal/telemetry"
)

func main() {

	logger := initLogger()
	defer logger.Sync()

	logger.Info("Starting IAM Service",
		zap.String("version", "1.0.0"),
	)

	cfg, err := config.Load()
	if err != nil {
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}

	shutdown := telemetry.InitTracing("iam-service", cfg.OTLPEndpoint())
	defer shutdown(context.Background())

	if err := repository.RunMigrations(cfg.Database.DSN(), logger); err != nil {
		logger.Fatal("Failed to run database migrations", zap.Error(err))
	}

	ctx := context.Background()
	pool, err := initDatabase(ctx, cfg, logger)
	if err != nil {
		logger.Fatal("Failed to initialize database", zap.Error(err))
	}
	defer pool.Close()

	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Host + ":" + cfg.Redis.Port,
		Password: cfg.Redis.Password,
	})
	defer rdb.Close()

	if err := rdb.Ping(ctx).Err(); err != nil {
		logger.Warn("Failed to ping Redis on startup", zap.String("addr", cfg.Redis.Host+":"+cfg.Redis.Port), zap.Error(err))
	} else {
		logger.Info("Connected to Redis successfully", zap.String("addr", cfg.Redis.Host+":"+cfg.Redis.Port))
	}

	deps := initDependencies(cfg, pool, rdb, logger)

	r := router.New(deps.authHandler, deps.userHandler, deps.adminHandler, deps.healthHandler, deps.promoHandler, deps.usageHandler, deps.jwtService, cfg.InternalServiceKey, logger)
	engine := r.Setup()

	server := &http.Server{
		Addr:		":" + cfg.Server.Port,
		Handler:	engine,
		ReadTimeout:	15 * time.Second,
		WriteTimeout:	15 * time.Second,
		IdleTimeout:	60 * time.Second,
	}

	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			deps.healthHandler.RegisterPoolMetrics("iam-service")
		}
	}()

	go func() {
		logger.Info("Server starting",
			zap.String("port", cfg.Server.Port),
			zap.String("contextPath", cfg.Server.ContextPath),
		)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Server failed to start", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited gracefully")
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
			FunctionKey:	zapcore.OmitKey,
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

func initDatabase(ctx context.Context, cfg *config.Config, logger *zap.Logger) (*pgxpool.Pool, error) {
	poolConfig, err := pgxpool.ParseConfig(cfg.Database.DSN())
	if err != nil {
		return nil, fmt.Errorf("parse database config: %w", err)
	}

	poolConfig.MaxConns = 15
	poolConfig.MinConns = 2
	poolConfig.MaxConnLifetime = 30 * time.Minute
	poolConfig.MaxConnIdleTime = 5 * time.Minute

	var pool *pgxpool.Pool
	var lastErr error

	maxRetries := 5
	for i := 0; i < maxRetries; i++ {
		pool, err = pgxpool.NewWithConfig(ctx, poolConfig)
		if err == nil {
			err = pool.Ping(ctx)
		}

		if err == nil {
			logger.Info("Database connection established",
				zap.String("host", cfg.Database.Host),
				zap.String("database", cfg.Database.Database),
			)
			return pool, nil
		}

		lastErr = err
		logger.Warn("Database connection attempt failed, retrying...",
			zap.Int("attempt", i+1),
			zap.Int("max_retries", maxRetries),
			zap.Error(err),
		)

		time.Sleep(time.Duration(i*2+1) * time.Second)
	}

	return nil, fmt.Errorf("database connection failed after %d attempts: %w", maxRetries, lastErr)
}

type dependencies struct {
	authHandler	*handler.AuthHandler
	userHandler	*handler.UserHandler
	adminHandler	*handler.AdminHandler
	healthHandler	*handler.HealthHandler
	promoHandler	*handler.PromoHandler
	usageHandler	*handler.UsageHandler
	jwtService	*service.JWTService
}

func initDependencies(cfg *config.Config, pool *pgxpool.Pool, rdb *redis.Client, logger *zap.Logger) *dependencies {

	userRepo := repository.NewUserRepository(pool)

	jwtService := service.NewJWTService(&cfg.JWT)
	mailService := service.NewMailService(&cfg.Mail, logger)
	userService := service.NewUserService(userRepo, logger)
	googleAuthService := service.NewGoogleAuthService(&cfg.Google, logger)
	otpCache := cache.NewOTPCache(rdb)
	authService := service.NewAuthService(userService, mailService, jwtService, otpCache, logger)

	authHandler := handler.NewAuthHandler(authService, googleAuthService, logger)
	userHandler := handler.NewUserHandler(userService, logger)
	adminHandler := handler.NewAdminHandler(userService, logger)
	healthHandler := handler.NewHealthHandler(pool)
	promoHandler := handler.NewPromoHandler(userService, logger)
	usageHandler := handler.NewUsageHandler(userService, logger)

	return &dependencies{
		authHandler:	authHandler,
		userHandler:	userHandler,
		adminHandler:	adminHandler,
		healthHandler:	healthHandler,
		promoHandler:	promoHandler,
		usageHandler:	usageHandler,
		jwtService:	jwtService,
	}
}
