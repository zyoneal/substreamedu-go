package service

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/model"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/repository"
	"go.uber.org/zap"
)

type OutboxService struct {
	repo	*repository.OutboxRepository
	logger	*zap.Logger
}

func NewOutboxService(repo *repository.OutboxRepository, logger *zap.Logger) *OutboxService {
	return &OutboxService{repo: repo, logger: logger}
}

func (s *OutboxService) SaveEvent(ctx context.Context, tx pgx.Tx, aggregateID, eventType string, payload interface{}, topic string) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	event := &model.OutboxEvent{
		AggregateID:	aggregateID,
		Type:		eventType,
		Payload:	string(jsonPayload),
		Topic:		topic,
		Status:		model.OutboxPending,
		CreatedAt:	time.Now(),
	}

	return s.repo.Save(ctx, tx, event)
}
