package kafka

import (
	"context"
	"encoding/json"
	"io"
	"time"

	"github.com/segmentio/kafka-go"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/service"
	"go.uber.org/zap"
)

type ReviewConsumer struct {
	reader		*kafka.Reader
	dlqWriter	*kafka.Writer
	learningService	*service.LearningService
	logger		*zap.Logger
}

func NewReviewConsumer(brokers []string, topic, groupID string, ls *service.LearningService, logger *zap.Logger) *ReviewConsumer {
	return &ReviewConsumer{
		reader: kafka.NewReader(kafka.ReaderConfig{
			Brokers:	brokers,
			Topic:		topic,
			GroupID:	groupID,
			MaxWait:	500 * time.Millisecond,
		}),
		dlqWriter: &kafka.Writer{
			Addr:     kafka.TCP(brokers...),
			Balancer: &kafka.LeastBytes{},
			Topic:    topic + "-dlq",
		},
		learningService:	ls,
		logger:			logger,
	}
}

func (c *ReviewConsumer) Start(ctx context.Context) {
	c.logger.Info("Starting Kafka Review Consumer", zap.String("topic", c.reader.Config().Topic))
	defer c.reader.Close()
	defer c.dlqWriter.Close()

	for {
		select {
		case <-ctx.Done():
			return
		default:
			msg, err := c.reader.ReadMessage(ctx)
			if err != nil {
				if err == io.EOF {
					return
				}
				c.logger.Error("Failed to read message from Kafka", zap.Error(err))
				continue
			}

			var event dto.WordReviewedEvent
			if err := json.Unmarshal(msg.Value, &event); err != nil {
				c.logger.Error("Failed to unmarshal review event, skipping",
					zap.Error(err),
					zap.ByteString("body", msg.Value),
				)

				if commitErr := c.reader.CommitMessages(ctx, msg); commitErr != nil {
					c.logger.Error("Failed to commit offset for bad message", zap.Error(commitErr))
				}
				continue
			}

			c.logger.Info("Processing review event from Kafka",
				zap.String("userId", event.UserID.String()),
				zap.Int64("cardId", event.CardID))

			_, err = c.learningService.ReviewCard(ctx, event.CardID, event.Rating, 0)
			if err != nil {
				c.logger.Error("Failed to process review from Kafka", zap.Error(err))
				dlqMsg := kafka.Message{
					Key:   msg.Key,
					Value: msg.Value,
				}
				if dlqErr := c.dlqWriter.WriteMessages(ctx, dlqMsg); dlqErr != nil {
					c.logger.Error("Failed to write to DLQ", zap.Error(dlqErr))
				}
			}
		}
	}
}
