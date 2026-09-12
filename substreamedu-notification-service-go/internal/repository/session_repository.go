package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SessionRepository struct {
	db *pgxpool.Pool
}

func NewSessionRepository(db *pgxpool.Pool) *SessionRepository {
	return &SessionRepository{db: db}
}

func (r *SessionRepository) SaveSession(ctx context.Context, chatID int64, data interface{}, ttl time.Duration) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}
	_, err = r.db.Exec(ctx,
		`INSERT INTO bot_sessions (chat_id, session_data, session_type, expires_at)
		 VALUES ($1, $2, $3, NOW() + $4::interval)
		 ON CONFLICT (chat_id, session_type) DO UPDATE
		 SET session_data = $2, expires_at = NOW() + $4::interval, updated_at = NOW()`,
		chatID, jsonData, "review", fmt.Sprintf("%d seconds", int(ttl.Seconds())))
	return err
}

func (r *SessionRepository) GetSession(ctx context.Context, chatID int64, sessionType string) ([]byte, error) {
	var data []byte
	err := r.db.QueryRow(ctx,
		`SELECT session_data FROM bot_sessions
		 WHERE chat_id = $1 AND session_type = $2 AND expires_at > NOW()`,
		chatID, sessionType).Scan(&data)
	if err != nil {
		return nil, err
	}
	return data, nil
}

func (r *SessionRepository) DeleteSession(ctx context.Context, chatID int64, sessionType string) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM bot_sessions WHERE chat_id = $1 AND session_type = $2`,
		chatID, sessionType)
	return err
}

func (r *SessionRepository) HasSession(ctx context.Context, chatID int64, sessionType string) (bool, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(1) FROM bot_sessions
		 WHERE chat_id = $1 AND session_type = $2 AND expires_at > NOW()`,
		chatID, sessionType).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *SessionRepository) CleanupExpired(ctx context.Context) error {
	_, err := r.db.Exec(ctx, `DELETE FROM bot_sessions WHERE expires_at < NOW()`)
	return err
}

var ErrSessionNotFound = pgx.ErrNoRows
