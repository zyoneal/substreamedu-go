package model

import (
	"time"

	"github.com/google/uuid"
)

type Subtitle struct {
	ID		int64		`json:"id" db:"id"`
	UserID		uuid.UUID	`json:"userId" db:"user_id"`
	Name		string		`json:"name" db:"name"`
	StartTimeMs	int32		`json:"startTimeMs" db:"start_time_ms"`
	EndTimeMs	int32		`json:"endTimeMs" db:"end_time_ms"`
	Text		string		`json:"text" db:"text"`
	CreatedAt	time.Time	`json:"createdAt" db:"created_at"`
}
