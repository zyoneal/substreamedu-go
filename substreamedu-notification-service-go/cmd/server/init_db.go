package main

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/substreamedu/substreamedu-notification-service/internal/config"
	"go.uber.org/zap"
)

func initDatabase(ctx context.Context, cfg *config.Config, logger *zap.Logger) (*pgxpool.Pool, error) {
	poolConfig, err := pgxpool.ParseConfig(cfg.Database.DSN())
	if err != nil {
		return nil, fmt.Errorf("parse database config: %w", err)
	}

	poolConfig.MaxConns = 10
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
