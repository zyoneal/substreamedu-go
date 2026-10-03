// Package repository provides data access layer and database migrations.
package repository

import (
	"context"
	"embed"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// RunMigrations runs all database migrations.
func RunMigrations(pool *pgxpool.Pool, logger *zap.Logger) error {
	ctx := context.Background()

	// Read migration file
	migrationSQL, err := migrationsFS.ReadFile("migrations/000001_init_telegram_users.up.sql")
	if err != nil {
		return fmt.Errorf("read migration file: %w", err)
	}

	// Execute migration
	_, err = pool.Exec(ctx, string(migrationSQL))
	if err != nil {
		return fmt.Errorf("execute migration: %w", err)
	}

	logger.Info("Database migrations completed successfully")
	return nil
}
