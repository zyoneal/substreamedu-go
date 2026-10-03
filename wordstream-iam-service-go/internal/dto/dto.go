// Package dto provides Data Transfer Objects for API requests and responses.
package dto

import (
	"time"

	"github.com/google/uuid"
)

// AuthRequest represents login request body.
type AuthRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// OtpRequest represents OTP verification request body.
type OtpRequest struct {
	Email string `json:"email" binding:"required,email"`
	OTP   string `json:"otp" binding:"required"`
}

// GoogleAuthRequest represents Google OAuth request body.
type GoogleAuthRequest struct {
	Token string `json:"token" binding:"required"`
}

// GoogleUserInfo represents user information extracted from Google ID token.
type GoogleUserInfo struct {
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Sub           string `json:"sub"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

// AuthResponse represents authentication response.
type AuthResponse struct {
	UserID uuid.UUID `json:"userId"`
	Token  string    `json:"token"`
	Email  string    `json:"email"`
	Role   string    `json:"role"`
}

// UserDTO represents user data for API responses.
type UserDTO struct {
	ID            uuid.UUID `json:"id"`
	Email         string    `json:"email"`
	TelegramToken *string   `json:"telegramToken,omitempty"`
}

// ApiResponse is a generic API response wrapper.
// Follows consistent response format across all endpoints.
type ApiResponse[T any] struct {
	Success   bool      `json:"success"`
	Message   string    `json:"message,omitempty"`
	Data      T         `json:"data,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// Success creates a successful response with data.
func Success[T any](data T) ApiResponse[T] {
	return ApiResponse[T]{
		Success:   true,
		Data:      data,
		Timestamp: time.Now(),
	}
}

// SuccessWithMessage creates a successful response with message and data.
func SuccessWithMessage[T any](message string, data T) ApiResponse[T] {
	return ApiResponse[T]{
		Success:   true,
		Message:   message,
		Data:      data,
		Timestamp: time.Now(),
	}
}

// Error creates an error response.
func Error[T any](message string) ApiResponse[T] {
	return ApiResponse[T]{
		Success:   false,
		Message:   message,
		Timestamp: time.Now(),
	}
}
