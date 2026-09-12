package apperror

import (
	"fmt"
	"net/http"
)

type AppError struct {
	Code	int	`json:"-"`
	Message	string	`json:"message"`
	Err	error	`json:"-"`
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}

var (
	ErrUnauthorized	= &AppError{
		Code:		http.StatusUnauthorized,
		Message:	"Unauthorized",
	}

	ErrInvalidOTP	= &AppError{
		Code:		http.StatusUnauthorized,
		Message:	"Invalid or expired OTP",
	}

	ErrInvalidGoogleToken	= &AppError{
		Code:		http.StatusUnauthorized,
		Message:	"Invalid Google token",
	}

	ErrUserNotFound	= &AppError{
		Code:		http.StatusNotFound,
		Message:	"User not found",
	}

	ErrInvalidUserID	= &AppError{
		Code:		http.StatusBadRequest,
		Message:	"Invalid user ID",
	}

	ErrInternal	= &AppError{
		Code:		http.StatusInternalServerError,
		Message:	"Internal server error",
	}
)

func New(code int, message string) *AppError {
	return &AppError{
		Code:		code,
		Message:	message,
	}
}

func Wrap(err error, code int, message string) *AppError {
	return &AppError{
		Code:		code,
		Message:	message,
		Err:		err,
	}
}

func Unauthorized(message string) *AppError {
	return &AppError{
		Code:		http.StatusUnauthorized,
		Message:	message,
	}
}

func BadRequest(message string) *AppError {
	return &AppError{
		Code:		http.StatusBadRequest,
		Message:	message,
	}
}

func NotFound(message string) *AppError {
	return &AppError{
		Code:		http.StatusNotFound,
		Message:	message,
	}
}

func Internal(message string, err error) *AppError {
	return &AppError{
		Code:		http.StatusInternalServerError,
		Message:	message,
		Err:		err,
	}
}
