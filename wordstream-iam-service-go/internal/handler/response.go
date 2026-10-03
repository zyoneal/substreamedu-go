package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/substreamedu/wordstream-iam-service/internal/apperror"
	"github.com/substreamedu/wordstream-iam-service/internal/dto"
)

// respondError handles centralized error to HTTP mapping.
func respondError(c *gin.Context, err error) {
	if appErr, ok := err.(*apperror.AppError); ok {
		c.JSON(appErr.Code, dto.Error[any](appErr.Message))
		return
	}

	// Default to 500
	c.JSON(http.StatusInternalServerError, dto.Error[any]("Internal server error"))
}

// respondSuccess handles centralized success response wrapping.
func respondSuccess(c *gin.Context, data any) {
	c.JSON(http.StatusOK, dto.Success(data))
}

// respondSuccessMessage handles success with custom message.
func respondSuccessMessage(c *gin.Context, message string, data any) {
	c.JSON(http.StatusOK, dto.SuccessWithMessage(message, data))
}
