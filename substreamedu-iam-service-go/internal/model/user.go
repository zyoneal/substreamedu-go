package model

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	RoleUser	= "USER"
	RoleAdmin	= "SYSTEM_ADMIN"
)

type User struct {
	ID			uuid.UUID	`json:"id" db:"id"`
	Email			string		`json:"email" db:"email"`
	IsActive		bool		`json:"isActive" db:"is_active"`
	TelegramToken		*string		`json:"telegramToken,omitempty" db:"telegram_token"`
	IsPremium		bool		`json:"isPremium" db:"is_premium"`
	TranslationCount	int		`json:"translationCount" db:"translation_count"`
	SavedWordsCount		int		`json:"savedWordsCount" db:"saved_words_count"`
	Role			string		`json:"role" db:"role"`
	CreatedAt		time.Time	`json:"createdAt" db:"created_at"`
}

func NewUser(email string) *User {
	return &User{
		ID:			uuid.New(),
		Email:			strings.ToLower(strings.TrimSpace(email)),
		IsActive:		true,
		IsPremium:		false,
		TranslationCount:	0,
		SavedWordsCount:	0,
		Role:			RoleUser,
		CreatedAt:		time.Now(),
	}
}

func NewGoogleUser(email string) *User {
	token := uuid.New().String()
	return &User{
		ID:			uuid.New(),
		Email:			strings.ToLower(strings.TrimSpace(email)),
		IsActive:		true,
		TelegramToken:		&token,
		IsPremium:		false,
		TranslationCount:	0,
		SavedWordsCount:	0,
		Role:			RoleUser,
		CreatedAt:		time.Now(),
	}
}
