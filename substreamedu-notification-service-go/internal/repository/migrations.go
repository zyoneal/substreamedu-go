// Package repository provides data access layer and database migrations.
package repository

import (
	"embed"
	"fmt"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"go.uber.org/zap"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// RunMigrations runs all database migrations using golang-migrate.
func RunMigrations(dsn string, logger *zap.Logger) error {
	d, err := iofs.New(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("could not create iofs source: %w", err)
	}

	migrationDSN := dsn
	if !strings.Contains(migrationDSN, "x-migrations-table=") {
		sep := "?"
		if strings.Contains(migrationDSN, "?") {
			sep = "&"
		}
		migrationDSN = migrationDSN + sep + "x-migrations-table=schema_migrations_notification"
	}

	m, err := migrate.NewWithSourceInstance("iofs", d, migrationDSN)
	if err != nil {
		return fmt.Errorf("could not create migrate instance: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("could not run up migrations: %w", err)
	}

	logger.Info("Database migrations applied successfully")
	return nil
}
