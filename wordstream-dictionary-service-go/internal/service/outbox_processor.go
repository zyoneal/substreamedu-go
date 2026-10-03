package service

import (
	"context"
	"time"

	"github.com/segmentio/kafka-go"
	"github.com/substreamedu/wordstream-dictionary-service/internal/repository"
	"go.uber.org/zap"
)

type OutboxProcessor struct {
	repo   *repository.OutboxRepository
	writer *kafka.Writer
	logger *zap.Logger
}

func NewOutboxProcessor(repo *repository.OutboxRepository, writer *kafka.Writer, logger *zap.Logger) *OutboxProcessor {
	return &OutboxProcessor{repo: repo, writer: writer, logger: logger}
}

func (p *OutboxProcessor) Start(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			p.processEvents(ctx)
		}
	}
}

func (p *OutboxProcessor) processEvents(ctx context.Context) {
	events, err := p.repo.FindPending(ctx)
	if err != nil {
		p.logger.Error("Failed to fetch pending outbox events", zap.Error(err))
		return
	}

	for _, event := range events {
		err := p.writer.WriteMessages(ctx, kafka.Message{
			Topic: event.Topic,
			Key:   []byte(event.AggregateID),
			Value: []byte(event.Payload),
		})

		if err != nil {
			p.logger.Error("Failed to publish event to Kafka", zap.String("eventID", event.ID.String()), zap.Error(err))
			continue
		}

		if err := p.repo.MarkProcessed(ctx, event.ID); err != nil {
			p.logger.Error("Failed to mark outbox event as processed", zap.String("eventID", event.ID.String()), zap.Error(err))
		} else {
			p.logger.Info("Successfully processed outbox event", zap.String("eventID", event.ID.String()), zap.String("type", event.Type))
		}
	}
}
