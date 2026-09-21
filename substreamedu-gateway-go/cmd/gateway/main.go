package main

import (
	"context"
	"log"
	"net/http"
	"net/http/pprof"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/substreamedu/substreamedu-gateway/internal/cache"
	"github.com/substreamedu/substreamedu-gateway/internal/config"
	"github.com/substreamedu/substreamedu-gateway/internal/handler"
	"github.com/substreamedu/substreamedu-gateway/internal/middleware"
	"github.com/substreamedu/substreamedu-gateway/internal/proxy"
	"github.com/substreamedu/substreamedu-gateway/internal/telemetry"
	"go.uber.org/zap"
)

func main() {
	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatalf("failed to initialize zap logger: %v", err)
	}
	defer logger.Sync()

	cfg := config.Load()

	shutdown := telemetry.InitTracing("gateway", cfg.OTLPEndpoint)
	defer shutdown(context.Background())

	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisHost + ":6379",
		Password: cfg.RedisPassword,
	})
	responseCache := cache.NewResponseCache(rdb)

	proxyHandler := proxy.NewProxyHandler(cfg.Routes, logger)
	healthHandler := handler.NewHealthHandler()

	mux := http.NewServeMux()

	mux.HandleFunc("/gateway/actuator/health", healthHandler.Health)
	mux.HandleFunc("/gateway/actuator/info", healthHandler.Info)
	mux.HandleFunc("/gateway/actuator/prometheus", healthHandler.Prometheus())
	mux.HandleFunc("/actuator/health", healthHandler.Health)
	mux.HandleFunc("/health", healthHandler.Health)
	mux.HandleFunc("/api/gateway/actuator/health", healthHandler.Health)
	mux.HandleFunc("/api/gateway/health", healthHandler.Health)
	mux.HandleFunc("/api/health", healthHandler.Health)

	// SECURITY: pprof is gated behind ENABLE_PPROF env var to prevent
	// exposure of goroutine dumps, heap profiles, and CPU profiles in production.
	if os.Getenv("ENABLE_PPROF") == "true" {
		mux.HandleFunc("/gateway/debug/pprof/", pprof.Index)
		mux.HandleFunc("/gateway/debug/pprof/cmdline", pprof.Cmdline)
		mux.HandleFunc("/gateway/debug/pprof/profile", pprof.Profile)
		mux.HandleFunc("/gateway/debug/pprof/symbol", pprof.Symbol)
		mux.HandleFunc("/gateway/debug/pprof/trace", pprof.Trace)
	}

	gatewayLimiter := middleware.NewRateLimiter(100, time.Minute)
	finalHandler := middleware.StripSpoofableHeaders()(
		middleware.SecurityHeaders()(
			middleware.CORS(cfg.CORS.AllowedOrigins)(
				middleware.RateLimit(gatewayLimiter)(
					middleware.BlockInternalRoutes()(
						middleware.TokenRevocation(responseCache, logger)(
							middleware.Gzip(
								middleware.Cache(responseCache)(
									middleware.Tracing("gateway")(
										middleware.Logging(logger)(
											middleware.MaxBodySize(1 << 20)(proxyHandler),
										),
									),
								),
							),
						),
					),
				),
			),
		),
	)

	mux.Handle("/", finalHandler)

	srv := &http.Server{
		Addr:		":" + cfg.ServerPort,
		Handler:	mux,
		ReadTimeout:	95 * time.Second,
		WriteTimeout:	95 * time.Second,
		IdleTimeout:	60 * time.Second,
	}

	go func() {
		logger.Info("Starting gateway", zap.String("port", cfg.ServerPort))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("listen error", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down gateway...")
	ctx, cancel := context.WithTimeout(context.Background(), 95*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown:", zap.Error(err))
	}

	logger.Info("Gateway exiting")
}
