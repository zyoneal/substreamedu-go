// Package repository provides database operations.
package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/substreamedu/wordstream-media-service/internal/model"
)

// SubtitleRepository handles subtitle persistence.
type SubtitleRepository struct {
	db *pgxpool.Pool
}

// NewSubtitleRepository creates a new SubtitleRepository.
func NewSubtitleRepository(db *pgxpool.Pool) *SubtitleRepository {
	return &SubtitleRepository{db: db}
}

// SaveAll saves multiple subtitles using the high-performance Postgres Copy protocol.
// FAANG Senior Pattern: Use CopyFrom for bulk data loading to minimize round-trips.
func (r *SubtitleRepository) SaveAll(ctx context.Context, subs []model.Subtitle) error {
	inputRows := [][]interface{}{}
	for _, s := range subs {
		inputRows = append(inputRows, []interface{}{s.UserID, s.Name, s.StartTimeMs, s.EndTimeMs, s.Text})
	}

	_, err := r.db.CopyFrom(
		ctx,
		pgx.Identifier{"subtitle"},
		[]string{"user_id", "name", "start_time_ms", "end_time_ms", "text"},
		pgx.CopyFromRows(inputRows),
	)
	return err
}

// ExistsByUserIdAndName checks if subtitles for name already exist for user.
func (r *SubtitleRepository) ExistsByUserIdAndName(ctx context.Context, userID uuid.UUID, name string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM subtitle WHERE user_id = $1 AND name = $2)", userID, name).Scan(&exists)
	return exists, err
}

// FindTextsByName returns all subtitle texts by name.
func (r *SubtitleRepository) FindTextsByName(ctx context.Context, userID uuid.UUID, name string) ([]string, error) {
	rows, err := r.db.Query(ctx, "SELECT text FROM subtitle WHERE user_id = $1 AND name = $2 ORDER BY start_time_ms", userID, name)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var texts []string
	for rows.Next() {
		var text string
		if err := rows.Scan(&text); err != nil {
			return nil, err
		}
		texts = append(texts, text)
	}
	return texts, rows.Err()
}

// FindDistinctSubtitleNames returns distinct names of subtitles for user.
func (r *SubtitleRepository) FindDistinctSubtitleNames(ctx context.Context, userID uuid.UUID) ([]string, error) {
	rows, err := r.db.Query(ctx, "SELECT DISTINCT name FROM subtitle WHERE user_id = $1", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var names []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		names = append(names, name)
	}
	return names, rows.Err()
}

// FindByUserIdAndNameOrderByStartTimeMs returns ordered subtitles by name.
func (r *SubtitleRepository) FindByUserIdAndNameOrderByStartTimeMs(ctx context.Context, userID uuid.UUID, name string) ([]model.Subtitle, error) {
	rows, err := r.db.Query(ctx, "SELECT id, user_id, name, start_time_ms, end_time_ms, text FROM subtitle WHERE user_id = $1 AND name = $2 ORDER BY start_time_ms", userID, name)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subs []model.Subtitle
	for rows.Next() {
		var s model.Subtitle
		if err := rows.Scan(&s.ID, &s.UserID, &s.Name, &s.StartTimeMs, &s.EndTimeMs, &s.Text); err != nil {
			return nil, err
		}
		subs = append(subs, s)
	}
	return subs, rows.Err()
}

// DeleteByUserIdAndName deletes subtitles by name for user.
func (r *SubtitleRepository) DeleteByUserIdAndName(ctx context.Context, userID uuid.UUID, name string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM subtitle WHERE user_id = $1 AND name = $2", userID, name)
	return err
}

func (r *SubtitleRepository) CountDistinctNamesByUserId(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, "SELECT COUNT(DISTINCT name) FROM subtitle WHERE user_id = $1", userID).Scan(&count)
	return count, err
}
