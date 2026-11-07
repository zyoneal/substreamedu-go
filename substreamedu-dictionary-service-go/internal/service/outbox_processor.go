package service

import (
	"context"
	"time"

	"github.com/segmentio/kafka-go"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/repository"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/resilience"
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

		retryCfg := resilience.RetryConfig{
			MaxAttempts:     3,
			InitialInterval: 100 * time.Millisecond,
			MaxInterval:     1 * time.Second,
			Multiplier:      2.0,
			IsRetryable:     func(err error) bool { return true },
		}

		lastErr := resilience.Retry(ctx, retryCfg, func(opCtx context.Context) error {
			return p.writer.WriteMessages(opCtx, msg)
		})

		if lastErr != nil {
			p.logger.Error("Failed to publish event to Kafka after 3 retries, routing to DEAD_LETTER",
				zap.String("eventID", event.ID.String()),
				zap.Error(lastErr),
			)
			if dlqErr := p.repo.MarkDeadLetter(ctx, event.ID, lastErr.Error()); dlqErr != nil {
				p.logger.Error("Failed to mark outbox event as DEAD_LETTER", zap.String("eventID", event.ID.String()), zap.Error(dlqErr))
			}
			continue
		}

		if err := p.repo.MarkProcessed(ctx, event.ID); err != nil {
			p.logger.Error("Failed to mark outbox event as processed", zap.String("eventID", event.ID.String()), zap.Error(err))
		} else {
			p.logger.Info("Successfully processed outbox event", zap.String("eventID", event.ID.String()), zap.String("type", event.Type))
		}
	}
}
