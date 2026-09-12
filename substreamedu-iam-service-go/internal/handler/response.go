package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/substreamedu/substreamedu-iam-service/internal/apperror"
	"github.com/substreamedu/substreamedu-iam-service/internal/dto"
)

func respondError(c *gin.Context, err error) {
	if appErr, ok := err.(*apperror.AppError); ok {
		c.JSON(appErr.Code, dto.Error[any](appErr.Message))
		return
	}

	c.JSON(http.StatusInternalServerError, dto.Error[any]("Internal server error"))
}

func respondSuccess(c *gin.Context, data any) {
	c.JSON(http.StatusOK, dto.Success(data))
}

func respondSuccessMessage(c *gin.Context, message string, data any) {
	c.JSON(http.StatusOK, dto.SuccessWithMessage(message, data))
}
