package service

import (
	"context"
	"time"

	"github.com/segmentio/kafka-go"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/repository"
	"go.uber.org/zap"
)

type OutboxProcessor struct {
	repo	*repository.OutboxRepository
	writer	*kafka.Writer
	logger	*zap.Logger
}

func NewOutboxProcessor(repo *repository.OutboxRepository, writer *kafka.Writer, logger *zap.Logger) *OutboxProcessor {
	return &OutboxProcessor{repo: repo, writer: writer, logger: logger}
}

func (p *OutboxProcessor) Start(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	cleanupTicker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()
	defer cleanupTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			p.processEvents(ctx)
		case <-cleanupTicker.C:
			cutoff := time.Now().Add(-7 * 24 * time.Hour)
			deleted, err := p.repo.DeleteProcessedBefore(ctx, cutoff)
			if err != nil {
				p.logger.Error("Failed to prune old outbox events", zap.Error(err))
			} else if deleted > 0 {
				p.logger.Info("Pruned old outbox events", zap.Int64("deleted", deleted))
			}
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
		msg := kafka.Message{
			Topic:	event.Topic,
			Key:	[]byte(event.AggregateID),
			Value:	[]byte(event.Payload),
		}

		var lastErr error
		for i := 0; i < 3; i++ {
			if err := p.writer.WriteMessages(ctx, msg); err == nil {
				lastErr = nil
				break
			} else {
				lastErr = err
				p.logger.Warn("Kafka write attempt failed, retrying...",
					zap.Int("attempt", i+1),
					zap.String("eventID", event.ID.String()),
					zap.Error(err),
				)
				time.Sleep(time.Duration(i+1) * 500 * time.Millisecond)
			}
		}

		if lastErr != nil {
			p.logger.Error("Failed to publish event to Kafka after 3 retries",
				zap.String("eventID", event.ID.String()),
				zap.Error(lastErr),
			)
			continue
		}

		if err := p.repo.MarkProcessed(ctx, event.ID); err != nil {
			p.logger.Error("Failed to mark outbox event as processed", zap.String("eventID", event.ID.String()), zap.Error(err))
		} else {
			p.logger.Info("Successfully processed outbox event", zap.String("eventID", event.ID.String()), zap.String("type", event.Type))
		}
	}
}
