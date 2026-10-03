package kafka

import (
	"context"
	"encoding/json"
	"io"
	"time"

	"github.com/segmentio/kafka-go"
	"github.com/substreamedu/wordstream-dictionary-service/internal/dto"
	"github.com/substreamedu/wordstream-dictionary-service/internal/service"
	"go.uber.org/zap"
)

type ReviewConsumer struct {
	reader          *kafka.Reader
	learningService *service.LearningService
	logger          *zap.Logger
}

func NewReviewConsumer(brokers []string, topic, groupID string, ls *service.LearningService, logger *zap.Logger) *ReviewConsumer {
	return &ReviewConsumer{
		reader: kafka.NewReader(kafka.ReaderConfig{
			Brokers: brokers,
			Topic:   topic,
			GroupID: groupID,
			MaxWait: 500 * time.Millisecond,
		}),
		learningService: ls,
		logger:          logger,
	}
}

func (c *ReviewConsumer) Start(ctx context.Context) {
	c.logger.Info("Starting Kafka Review Consumer", zap.String("topic", c.reader.Config().Topic))
	defer c.reader.Close()

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
				c.logger.Error("Failed to unmarshal review event", zap.Error(err))
				continue
			}

			c.logger.Info("Processing review event from Kafka",
				zap.String("userId", event.UserID.String()),
				zap.Int64("cardId", event.CardID))

			// Process the review.
			// Note: bot sends Rating (string: forgot/remember) and ResponseTimeMs (int)
			// SM2 engine expects Rating (string) and DurationMs (int)
			_, err = c.learningService.ReviewCard(ctx, event.CardID, event.Rating, 0) // Duration is optional for SM2
			if err != nil {
				c.logger.Error("Failed to process review from Kafka", zap.Error(err))
			}
		}
	}
}
