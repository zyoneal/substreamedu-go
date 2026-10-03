package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/substreamedu/wordstream-gateway/internal/config"
	"github.com/substreamedu/wordstream-gateway/internal/handler"
	"github.com/substreamedu/wordstream-gateway/internal/middleware"
	"github.com/substreamedu/wordstream-gateway/internal/proxy"
	"go.uber.org/zap"
)

func main() {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	cfg := config.Load()

	// Handlers
	proxyHandler := proxy.NewProxyHandler(cfg.Routes, logger)
	healthHandler := handler.NewHealthHandler()

	// Mux
	mux := http.NewServeMux()

	// Actuator routes
	mux.Handle("/gateway/actuator/", healthHandler)

	// Proxy everything else
	// Replicating CORS and Logging
	finalHandler := middleware.Logging(middleware.CORS(cfg.CORS.AllowedOrigins)(proxyHandler))

	mux.Handle("/", finalHandler)

	srv := &http.Server{
		Addr:         ":" + cfg.ServerPort,
		Handler:      mux,
		ReadTimeout:  95 * time.Second, // FAANG Optimization: Accommodate proxied AI tasks
		WriteTimeout: 95 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.Info("Starting gateway", zap.String("port", cfg.ServerPort))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("listen error", zap.Error(err))
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down gateway...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown:", zap.Error(err))
	}

	logger.Info("Gateway exiting")
}
