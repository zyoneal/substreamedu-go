// Package apperror provides custom application errors with HTTP status codes.
// Enables centralized error handling with consistent API responses.
package apperror

import (
	"fmt"
	"net/http"
)

// AppError represents an application error with HTTP status code.
type AppError struct {
	Code    int    `json:"-"`
	Message string `json:"message"`
	Err     error  `json:"-"`
}

// Error implements the error interface.
func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

// Unwrap returns the underlying error for errors.Is/As support.
func (e *AppError) Unwrap() error {
	return e.Err
}

// Predefined errors following FAANG error handling patterns.
var (
	ErrUnauthorized = &AppError{
		Code:    http.StatusUnauthorized,
		Message: "Unauthorized",
	}

	ErrInvalidOTP = &AppError{
		Code:    http.StatusUnauthorized,
		Message: "Invalid or expired OTP",
	}

	ErrInvalidGoogleToken = &AppError{
		Code:    http.StatusUnauthorized,
		Message: "Invalid Google token",
	}

	ErrUserNotFound = &AppError{
		Code:    http.StatusNotFound,
		Message: "User not found",
	}

	ErrInvalidUserID = &AppError{
		Code:    http.StatusBadRequest,
		Message: "Invalid user ID",
	}

	ErrInternal = &AppError{
		Code:    http.StatusInternalServerError,
		Message: "Internal server error",
	}
)

// New creates a new AppError with custom message.
func New(code int, message string) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
	}
}

// Wrap wraps an existing error with context.
func Wrap(err error, code int, message string) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Err:     err,
	}
}

// Unauthorized creates an unauthorized error.
func Unauthorized(message string) *AppError {
	return &AppError{
		Code:    http.StatusUnauthorized,
		Message: message,
	}
}

// BadRequest creates a bad request error.
func BadRequest(message string) *AppError {
	return &AppError{
		Code:    http.StatusBadRequest,
		Message: message,
	}
}

// NotFound creates a not found error.
func NotFound(message string) *AppError {
	return &AppError{
		Code:    http.StatusNotFound,
		Message: message,
	}
}

// Internal creates an internal server error.
func Internal(message string, err error) *AppError {
	return &AppError{
		Code:    http.StatusInternalServerError,
		Message: message,
		Err:     err,
	}
}
