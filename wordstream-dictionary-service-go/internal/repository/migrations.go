package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

func InitSchema(db *pgxpool.Pool, logger *zap.Logger) {
	ctx := context.Background()

	// Leech Detection Support
	_, err := db.Exec(ctx, `
		ALTER TABLE dictionary ADD COLUMN IF NOT EXISTS is_leech BOOLEAN DEFAULT FALSE;
		CREATE INDEX IF NOT EXISTS idx_dictionary_is_leech ON dictionary(is_leech) WHERE is_leech = TRUE;
	`)
	if err != nil {
		logger.Error("Failed to apply dictionary schema updates", zap.Error(err))
	} else {
		logger.Info("Dictionary schema updates applied successfully")
	}

	// Ensure other necessary columns for SM-2 and FSRS exist if not already
	_, err = db.Exec(ctx, `
		ALTER TABLE dictionary ADD COLUMN IF NOT EXISTS definition TEXT DEFAULT '';
		ALTER TABLE dictionary ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
		ALTER TABLE dictionary ADD COLUMN IF NOT EXISTS learning_due TIMESTAMP WITH TIME ZONE;
		ALTER TABLE dictionary ADD COLUMN IF NOT EXISTS stability DOUBLE PRECISION DEFAULT 0;
		ALTER TABLE dictionary ADD COLUMN IF NOT EXISTS retrievability DOUBLE PRECISION DEFAULT 0;
		ALTER TABLE dictionary ADD COLUMN IF NOT EXISTS rolling_retention DOUBLE PRECISION DEFAULT 0;
		ALTER TABLE dictionary ADD COLUMN IF NOT EXISTS card_type INTEGER DEFAULT 0;
	`)
	if err != nil {
		logger.Error("Failed to apply additional dictionary columns", zap.Error(err))
	}

	// Data Migration: Create Production cards for existing Recognition cards
	// We only do this if there are no cards of type 1 yet, to avoid duplicate migrations
	var prodCount int
	err = db.QueryRow(ctx, "SELECT COUNT(*) FROM dictionary WHERE card_type = 1").Scan(&prodCount)
	if err == nil && prodCount == 0 {
		logger.Info("Starting data migration: creating production cards for existing recognition cards")
		_, err = db.Exec(ctx, `
			INSERT INTO dictionary (
				user_id, highlighted_text, translated_text, transcription, context, 
				resource_name, status, ease_factor, interval, repetition_level, 
				next_repetition_date, definition, image_url, card_type
			)
			SELECT 
				user_id, highlighted_text, translated_text, transcription, context, 
				resource_name, 'new', 2.5, 0, 0, 
				NULL, definition, image_url, 1
			FROM dictionary 
			WHERE card_type = 0
		`)
		if err != nil {
			logger.Error("Failed to migrate existing cards to dual-card system", zap.Error(err))
		} else {
			logger.Info("Dual-card data migration completed successfully")
		}
	}

	// FAANG Optimization: Composite index for fast GROUP BY resource_name queries
	// + Covering index for FindAllLexemesLight (prevents 21s full table scan)
	// + Composite index for FindDueWordsSorted (accelerates SRS daily cards query)
	_, err = db.Exec(ctx, `
		CREATE INDEX IF NOT EXISTS idx_dictionary_user_resource ON dictionary(user_id, resource_name);
		CREATE INDEX IF NOT EXISTS idx_dictionary_srs ON dictionary(user_id, next_repetition_date) WHERE status != 'new';
		CREATE INDEX IF NOT EXISTS idx_dictionary_user_id ON dictionary(user_id);
		CREATE INDEX IF NOT EXISTS idx_dictionary_user_status_due ON dictionary(user_id, status, next_repetition_date, learning_due);
	`)
	if err != nil {
		logger.Error("Failed to apply performance indexes", zap.Error(err))
	} else {
		logger.Info("Performance indexes applied successfully")
	}
}
