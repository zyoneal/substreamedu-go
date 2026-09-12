package service

import (
	"context"
	"fmt"

	"github.com/substreamedu/substreamedu-iam-service/internal/apperror"
	"github.com/substreamedu/substreamedu-iam-service/internal/config"
	"github.com/substreamedu/substreamedu-iam-service/internal/dto"
	"go.uber.org/zap"
	"google.golang.org/api/idtoken"
)

type GoogleAuthService struct {
	cfg	*config.GoogleConfig
	logger	*zap.Logger
}

func NewGoogleAuthService(cfg *config.GoogleConfig, logger *zap.Logger) *GoogleAuthService {
	return &GoogleAuthService{
		cfg:	cfg,
		logger:	logger,
	}
}

func (s *GoogleAuthService) VerifyToken(ctx context.Context, token string) (*dto.GoogleUserInfo, error) {
	if token == "" {
		return nil, fmt.Errorf("empty token")
	}

	if s.cfg.ClientID == "" {
		s.logger.Error("GOOGLE_OAUTH_CLIENT_ID is not configured")
		return nil, fmt.Errorf("server configuration error")
	}

	payload, err := idtoken.Validate(ctx, token, s.cfg.ClientID)
	if err != nil {
		s.logger.Warn("Failed to validate Google ID token", zap.Error(err))
		return nil, apperror.Wrap(err, 401, "Invalid Google token")
	}

	email, ok := payload.Claims["email"].(string)
	if !ok {
		return nil, fmt.Errorf("email claim missing in token")
	}

	emailVerified := false
	if val, ok := payload.Claims["email_verified"].(bool); ok {
		emailVerified = val
	}

	name, _ := payload.Claims["name"].(string)
	picture, _ := payload.Claims["picture"].(string)

	userInfo := &dto.GoogleUserInfo{
		Email:		email,
		EmailVerified:	emailVerified,
		Sub:		payload.Subject,
		Name:		name,
		Picture:	picture,
	}

	s.logger.Info("Google token verified successfully",
		zap.String("email", email),
		zap.Bool("email_verified", emailVerified),
	)

	return userInfo, nil
}
