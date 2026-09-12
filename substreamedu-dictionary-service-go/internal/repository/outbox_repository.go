package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/model"
)

type OutboxRepository struct {
	db *pgxpool.Pool
}

func NewOutboxRepository(db *pgxpool.Pool) *OutboxRepository {
	return &OutboxRepository{db: db}
}

func (r *OutboxRepository) Save(ctx context.Context, tx pgx.Tx, e *model.OutboxEvent) error {
	var err error
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	query := `
		INSERT INTO outbox_events (id, aggregate_id, type, payload, topic, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	if tx != nil {
		_, err = tx.Exec(ctx, query, e.ID, e.AggregateID, e.Type, e.Payload, e.Topic, e.Status, time.Now())
	} else {
		_, err = r.db.Exec(ctx, query, e.ID, e.AggregateID, e.Type, e.Payload, e.Topic, e.Status, time.Now())
	}
	return err
}

func (r *OutboxRepository) FindPending(ctx context.Context) ([]model.OutboxEvent, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, aggregate_id, type, payload, topic, status, created_at
		FROM outbox_events WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT 100`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.OutboxEvent
	for rows.Next() {
		var e model.OutboxEvent
		err := rows.Scan(&e.ID, &e.AggregateID, &e.Type, &e.Payload, &e.Topic, &e.Status, &e.CreatedAt)
		if err != nil {
			return nil, err
		}
		result = append(result, e)
	}
	return result, nil
}

func (r *OutboxRepository) MarkProcessed(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `UPDATE outbox_events SET status = 'PROCESSED', processed_at = NOW() WHERE id = $1`, id)
	return err
}

func (r *OutboxRepository) DeleteProcessedBefore(ctx context.Context, before time.Time) (int64, error) {
	result, err := r.db.Exec(ctx, `DELETE FROM outbox_events WHERE status = 'PROCESSED' AND processed_at < $1`, before)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
