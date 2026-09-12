package model

import (
	"time"

	"github.com/google/uuid"
)

type Dictionary struct {
	ID			int64		`json:"id" db:"id"`
	UserID			uuid.UUID	`json:"userId" db:"user_id"`
	Word			string		`json:"word" db:"highlighted_text"`
	Translation		string		`json:"translation" db:"translated_text"`
	Transcription		string		`json:"transcription" db:"transcription"`
	Context			string		`json:"context" db:"context"`
	Source			string		`json:"source" db:"resource_name"`
	Status			string		`json:"status" db:"status"`
	EaseFactor		float32		`json:"easeFactor" db:"ease_factor"`
	Interval		float32		`json:"interval" db:"interval"`
	RepetitionLevel		int		`json:"repetitionLevel" db:"repetition_level"`
	LastReviewed		*time.Time	`json:"lastReviewed" db:"last_reviewed"`
	NextRepetitionDate	*time.Time	`json:"nextRepetitionDate" db:"next_repetition_date"`
	CreatedAt		time.Time	`json:"createdAt" db:"created_on"`
	UpdatedAt		time.Time	`json:"updatedAt"`
	DifficultyScore		float32		`json:"difficultyScore" db:"difficulty_score"`
	Lapses			int		`json:"lapses" db:"lapses"`
	ConsecutiveSuccess	int		`json:"consecutiveSuccess" db:"consecutive_success"`
	Stability		float32		`json:"stability" db:"stability"`
	Retrievability		float32		`json:"retrievability" db:"retrievability"`
	RollingRetention	float32		`json:"rollingRetention" db:"rolling_retention"`
	TotalReviews		int		`json:"totalReviews" db:"total_reviews"`
	CorrectReviews		int		`json:"correctReviews" db:"correct_reviews"`
	HardCount		int		`json:"hardCount" db:"hard_count"`
	LearningStep		int		`json:"learningStep" db:"learning_step"`
	LearningDue		*time.Time	`json:"learningDue" db:"learning_due"`
	Definition		string		`json:"definition" db:"definition"`
	ImageUrl		string		`json:"imageUrl" db:"image_url"`
	IsLeech			bool		`json:"isLeech" db:"is_leech"`
	CardType		int		`json:"cardType" db:"card_type"`
}

type OutboxStatus string

const (
	OutboxPending	OutboxStatus	= "PENDING"
	OutboxProcessed	OutboxStatus	= "PROCESSED"
)

type OutboxEvent struct {
	ID		uuid.UUID	`json:"id" db:"id"`
	AggregateID	string		`json:"aggregateId" db:"aggregate_id"`
	Type		string		`json:"type" db:"type"`
	Payload		string		`json:"payload" db:"payload"`
	Topic		string		`json:"topic" db:"topic"`
	Status		OutboxStatus	`json:"status" db:"status"`
	CreatedAt	time.Time	`json:"createdAt" db:"created_at"`
	ProcessedAt	*time.Time	`json:"processedAt" db:"processed_at"`
}

type UserSRSParameters struct {
	UserID		uuid.UUID	`json:"userId" db:"user_id"`
	W0		float32		`json:"w0" db:"w0"`
	W1		float32		`json:"w1" db:"w1"`
	W2		float32		`json:"w2" db:"w2"`
	W3		float32		`json:"w3" db:"w3"`
	W4		float32		`json:"w4" db:"w4"`
	W5		float32		`json:"w5" db:"w5"`
	W6		float32		`json:"w6" db:"w6"`
	W7		float32		`json:"w7" db:"w7"`
	W8		float32		`json:"w8" db:"w8"`
	W9		float32		`json:"w9" db:"w9"`
	W10		float32		`json:"w10" db:"w10"`
	W11		float32		`json:"w11" db:"w11"`
	W12		float32		`json:"w12" db:"w12"`
	W13		float32		`json:"w13" db:"w13"`
	W14		float32		`json:"w14" db:"w14"`
	CreatedAt	time.Time	`json:"createdAt" db:"created_at"`
	UpdatedAt	time.Time	`json:"updatedAt" db:"updated_at"`
}

type DictionaryGroup struct {
	Name	string	`json:"groupName"`
	Count	int	`json:"numberOfWords"`
}

type ReviewLog struct {
	ID			int64		`json:"id" db:"id"`
	UserID			uuid.UUID	`json:"userId" db:"user_id"`
	CardID			int64		`json:"cardId" db:"card_id"`
	ReviewedAt		time.Time	`json:"reviewedAt" db:"reviewed_at"`
	Rating			int		`json:"rating" db:"rating"`
	ResponseTimeMs		int		`json:"responseTimeMs" db:"response_time_ms"`
	StabilityBefore		float32		`json:"stabilityBefore" db:"stability_before"`
	DifficultyBefore	float32		`json:"difficultyBefore" db:"difficulty_before"`
	ElapsedDays		float32		`json:"elapsedDays" db:"elapsed_days"`
	ScheduledDays		float32		`json:"scheduledDays" db:"scheduled_days"`
	State			string		`json:"state" db:"state"`
}
