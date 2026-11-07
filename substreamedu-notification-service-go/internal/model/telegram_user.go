package model

import (
	"time"

	"github.com/google/uuid"
)

type TelegramUser struct {
	ChatID		int64		`db:"chat_id"`
	UserID		uuid.UUID	`db:"user_id"`
	Username	string		`db:"username"`
	FirstName	string		`db:"first_name"`
	LastName	string		`db:"last_name"`
	IsActive	bool		`db:"is_active"`
	CreatedAt	time.Time	`db:"created_at"`
	UpdatedAt	time.Time	`db:"updated_at"`
}
