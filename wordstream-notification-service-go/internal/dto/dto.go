// Package dto provides Data Transfer Objects.
package dto

import (
	"time"

	"github.com/google/uuid"
)

// UserResponse from IAM service.
type UserResponse struct {
	ID            uuid.UUID `json:"id"`
	Email         string    `json:"email"`
	Active        bool      `json:"active"`
	TelegramToken string    `json:"telegramToken"`
	Premium       bool      `json:"premium"`
}

// DictionaryItemResponse from Dictionary service.
type DictionaryItemResponse struct {
	ID                 int64     `json:"id"`
	UserID             uuid.UUID `json:"userId"`
	ResourceName       string    `json:"resourceName"`
	HighlightedText    string    `json:"highlightedText"`
	TranslatedText     string    `json:"translatedText"`
	Context            string    `json:"context"`
	ExtendedContext    string    `json:"extendedContext"`
	Note               string    `json:"note"`
	CreatedOn          time.Time `json:"createdOn"`
	Status             string    `json:"status"`
	RepetitionLevel    int       `json:"repetitionLevel"`
	NextRepetitionDate string    `json:"nextRepetitionDate"`
	Transcription      string    `json:"transcription"`
	Definition         string    `json:"definition"`
	ImageURL           string    `json:"imageUrl"`
	DifficultyScore    float32   `json:"difficultyScore"`
}

type DailySessionResponse struct {
	Cards               []DictionaryItemResponse `json:"cards"`
	TotalDictionarySize int64                    `json:"totalDictionarySize"`
}

type DictionaryStatsResponse struct {
	TotalWords    int64 `json:"totalWords"`
	NewWords      int64 `json:"newWords"`
	LearningWords int64 `json:"learningWords"`
	DueToday      int64 `json:"dueToday"`
	StreakDays    int   `json:"streakDays"`
}

type ReviewRequest struct {
	Rating         string `json:"rating"`
	ResponseTimeMs int    `json:"responseTimeMs"`
}

type ReviewResponse struct {
	Card             DictionaryItemResponse `json:"card"`
	RepeatInSession  bool                   `json:"repeatInSession"`
	NextIntervalDays int                    `json:"nextIntervalDays"`
	Stability        float32                `json:"stability"`
	Retrievability   float32                `json:"retrievability"`
	IsLeech          bool                   `json:"isLeech"`
}

// ApiResponse is a generic API response wrapper.
type ApiResponse[T any] struct {
	Status    string    `json:"status"`  // "success" or "error"
	Success   bool      `json:"success"` // For compatibility if mixed
	Message   string    `json:"message,omitempty"`
	Data      T         `json:"data,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// WordReviewedEvent for Kafka.
type WordReviewedEvent struct {
	UserID    uuid.UUID `json:"userId"`
	WordID    int64     `json:"wordId"`
	Rating    string    `json:"rating"`
	Timestamp time.Time `json:"timestamp"`
}
