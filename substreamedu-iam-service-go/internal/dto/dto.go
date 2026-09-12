package dto

import (
	"time"

	"github.com/google/uuid"
)

type AuthRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type OtpRequest struct {
	Email	string	`json:"email" binding:"required,email"`
	OTP	string	`json:"otp" binding:"required"`
}

type GoogleAuthRequest struct {
	Token string `json:"token" binding:"required"`
}

type GoogleUserInfo struct {
	Email		string	`json:"email"`
	EmailVerified	bool	`json:"email_verified"`
	Sub		string	`json:"sub"`
	Name		string	`json:"name"`
	Picture		string	`json:"picture"`
}

type AuthResponse struct {
	UserID		uuid.UUID	`json:"userId"`
	Token		string		`json:"token"`
	Email		string		`json:"email"`
	Role		string		`json:"role"`
	IsPremium	bool		`json:"isPremium"`
}

type UserDTO struct {
	ID			uuid.UUID	`json:"id"`
	Email			string		`json:"email"`
	TelegramToken		*string		`json:"telegramToken,omitempty"`
	IsPremium		bool		`json:"isPremium"`
	TranslationCount	int		`json:"translationCount"`
	SavedWordsCount		int		`json:"savedWordsCount"`
}

type ApiResponse[T any] struct {
	Success		bool		`json:"success"`
	Message		string		`json:"message,omitempty"`
	Data		T		`json:"data,omitempty"`
	Timestamp	time.Time	`json:"timestamp"`
}

func Success[T any](data T) ApiResponse[T] {
	return ApiResponse[T]{
		Success:	true,
		Data:		data,
		Timestamp:	time.Now(),
	}
}

func SuccessWithMessage[T any](message string, data T) ApiResponse[T] {
	return ApiResponse[T]{
		Success:	true,
		Message:	message,
		Data:		data,
		Timestamp:	time.Now(),
	}
}

func Error[T any](message string) ApiResponse[T] {
	return ApiResponse[T]{
		Success:	false,
		Message:	message,
		Timestamp:	time.Now(),
	}
}
