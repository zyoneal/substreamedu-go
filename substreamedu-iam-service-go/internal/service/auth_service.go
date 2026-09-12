package service

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"fmt"
	"strings"
	"time"

	"github.com/substreamedu/substreamedu-iam-service/internal/apperror"
	"github.com/substreamedu/substreamedu-iam-service/internal/cache"
	"github.com/substreamedu/substreamedu-iam-service/internal/dto"
	"github.com/substreamedu/substreamedu-iam-service/internal/model"
	"go.uber.org/zap"
)

type AuthService struct {
	userService	*UserService
	mailService	*MailService
	jwtService	*JWTService
	otpCache	*cache.OTPCache
	logger		*zap.Logger
}

func NewAuthService(
	userService *UserService,
	mailService *MailService,
	jwtService *JWTService,
	otpCache *cache.OTPCache,
	logger *zap.Logger,
) *AuthService {
	return &AuthService{
		userService:	userService,
		mailService:	mailService,
		jwtService:	jwtService,
		otpCache:	otpCache,
		logger:		logger,
	}
}

func (s *AuthService) SendMagicLink(ctx context.Context, email, telegramToken string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if existing := s.otpCache.Get(email); existing != nil {
		if time.Since(existing.CreatedAt) < 60*time.Second {
			return apperror.BadRequest("Please wait before requesting a new code")
		}
	}

	otp := generateOTP()
	s.otpCache.Set(email, otp)
	s.logger.Info("Generated OTP for login", zap.String("email", email), zap.String("otp", otp))

	if err := s.userService.UpdateTelegramToken(ctx, email, telegramToken); err != nil {
		s.logger.Warn("Failed to update telegram token", zap.String("email", email), zap.Error(err))
	}

	go func() {
		defer func() {
			if r := recover(); r != nil {
				s.logger.Error("Panic in mail goroutine", zap.String("email", email), zap.Any("recover", r))
			}
		}()
		if err := s.mailService.SendOTPEmail(email, otp); err != nil {
			s.logger.Error("Failed to send OTP email", zap.String("email", email), zap.Error(err))
		}
	}()

	return nil
}

func (s *AuthService) VerifyOTPAndAuthenticate(ctx context.Context, email, otp string) (*dto.AuthResponse, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	trimmedOTP := strings.TrimSpace(otp)

	s.logger.Info("Verifying OTP request", zap.String("email", email), zap.String("provided_otp", trimmedOTP))

	var valid bool
	if s.jwtService.IsDevMode() && trimmedOTP == "123456" {
		valid = true
		s.logger.Info("Development fallback OTP used", zap.String("email", email))
	} else {
		otpItem := s.otpCache.Get(email)
		if otpItem == nil {
			return nil, apperror.ErrInvalidOTP
		}

		if otpItem.Blocked {
			s.otpCache.Delete(email)
			return nil, apperror.BadRequest("OTP blocked due to too many failed attempts")
		}

		if subtle.ConstantTimeCompare([]byte(otpItem.Code), []byte(trimmedOTP)) != 1 {
			attempts := s.otpCache.IncrementAttempts(email)
			if attempts >= 3 {
				s.otpCache.Delete(email)
				return nil, apperror.BadRequest("OTP blocked due to too many failed attempts")
			}
			return nil, apperror.ErrInvalidOTP
		}
		valid = true
	}

	if !valid {
		return nil, apperror.ErrInvalidOTP
	}

	user, err := s.userService.FindOrCreateByEmail(ctx, email)
	if err != nil {
		return nil, apperror.Internal(fmt.Sprintf("Failed to find or create user: %v", err), err)
	}

	token, err := s.jwtService.GenerateToken(user)
	if err != nil {
		return nil, apperror.Internal("Failed to generate token", err)
	}

	s.otpCache.Delete(email)

	return &dto.AuthResponse{
		UserID:		user.ID,
		Token:		token,
		Email:		user.Email,
		Role:		user.Role,
		IsPremium:	user.IsPremium,
	}, nil
}

func (s *AuthService) AuthenticateGoogleUser(ctx context.Context, email string) (*dto.AuthResponse, error) {
	s.logger.Info("Processing Google authentication", zap.String("email", email))

	user, err := s.userService.FindOrCreateGoogleUser(ctx, email)
	if err != nil {
		return nil, apperror.Internal("Failed to find or create Google user", err)
	}

	token, err := s.jwtService.GenerateToken(user)
	if err != nil {
		return nil, apperror.Internal("Failed to generate token", err)
	}

	return &dto.AuthResponse{
		UserID:		user.ID,
		Token:		token,
		Email:		user.Email,
		Role:		user.Role,
		IsPremium:	user.IsPremium,
	}, nil
}

func (s *AuthService) FindByTelegramToken(ctx context.Context, token string) (*model.User, error) {
	return s.userService.FindByTelegramToken(ctx, token)
}

func generateOTP() string {
	b := make([]byte, 3)
	rand.Read(b)
	otp := int(b[0])<<16 | int(b[1])<<8 | int(b[2])
	return fmt.Sprintf("%06d", (otp%900000)+100000)
}
