// Package kafka provides Kafka producer and consumer.
package kafka

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/segmentio/kafka-go"
	"github.com/substreamedu/wordstream-notification-service/internal/config"
	"github.com/substreamedu/wordstream-notification-service/internal/dto"
	"go.uber.org/zap"
)

// Producer publishes events to Kafka.
type Producer struct {
	writer *kafka.Writer
	logger *zap.Logger
}

// NewProducer creates a new Kafka producer.
func NewProducer(cfg *config.KafkaConfig, logger *zap.Logger) *Producer {
	writer := &kafka.Writer{
		Addr:         kafka.TCP(strings.Split(cfg.Brokers, ",")...),
		Topic:        cfg.Topic,
		Balancer:     &kafka.LeastBytes{},
		BatchSize:    100,
		BatchTimeout: 1 * time.Second,
		RequiredAcks: kafka.RequireOne,
	}

	return &Producer{
		writer: writer,
		logger: logger,
	}
}

// PublishWordReviewed publishes a word reviewed event.
func (p *Producer) PublishWordReviewed(ctx context.Context, event *dto.WordReviewedEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return err
	}

	msg := kafka.Message{
		Key:   []byte(event.UserID.String()),
		Value: data,
	}

	err = p.writer.WriteMessages(ctx, msg)
	if err != nil {
		p.logger.Error("Failed to publish event",
			zap.Error(err),
			zap.String("userId", event.UserID.String()),
		)
		return err
	}

	p.logger.Info("Published word reviewed event",
		zap.String("userId", event.UserID.String()),
		zap.Int64("wordId", event.WordID),
	)

	return nil
}

// Close closes the producer.
func (p *Producer) Close() error {
	return p.writer.Close()
}

// Consumer consumes events from Kafka.
type Consumer struct {
	reader  *kafka.Reader
	logger  *zap.Logger
	handler func(event *dto.WordReviewedEvent)
}

// NewConsumer creates a new Kafka consumer.
func NewConsumer(cfg *config.KafkaConfig, logger *zap.Logger, handler func(event *dto.WordReviewedEvent)) *Consumer {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        strings.Split(cfg.Brokers, ","),
		Topic:          cfg.Topic,
		GroupID:        cfg.GroupID,
		MinBytes:       10e3,
		MaxBytes:       10e6,
		MaxWait:        1 * time.Second,
		CommitInterval: time.Second,
	})

	return &Consumer{
		reader:  reader,
		logger:  logger,
		handler: handler,
	}
}

// Start starts consuming messages.
func (c *Consumer) Start(ctx context.Context) {
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			default:
				msg, err := c.reader.ReadMessage(ctx)
				if err != nil {
					if ctx.Err() != nil {
						return
					}
					c.logger.Error("Failed to read message", zap.Error(err))
					time.Sleep(5 * time.Second) // Backoff to avoid tight-loop CPU burn
					continue
				}

				var event dto.WordReviewedEvent
				if err := json.Unmarshal(msg.Value, &event); err != nil {
					c.logger.Error("Failed to unmarshal event", zap.Error(err))
					continue
				}

				c.logger.Info("Received word reviewed event",
					zap.String("userId", event.UserID.String()),
					zap.Int64("wordId", event.WordID),
				)

				c.handler(&event)
			}
		}
	}()
}

// Close closes the consumer.
func (c *Consumer) Close() error {
	return c.reader.Close()
}
