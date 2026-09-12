package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/substreamedu/substreamedu-iam-service/internal/model"
	"github.com/substreamedu/substreamedu-iam-service/internal/repository"
	"go.uber.org/zap"
)

type UserService struct {
	repo	repository.UserRepository
	logger	*zap.Logger
}

func NewUserService(repo repository.UserRepository, logger *zap.Logger) *UserService {
	return &UserService{
		repo:	repo,
		logger:	logger,
	}
}

func (s *UserService) FindOrCreateByEmail(ctx context.Context, email string) (*model.User, error) {
	user, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("find user: %w", err)
	}

	if user != nil {
		return user, nil
	}

	newUser := model.NewUser(email)
	if err := s.repo.Save(ctx, newUser); err != nil {
		var pgErr *pgconn.PgError
		if (errors.As(err, &pgErr) && pgErr.Code == "23505") || strings.Contains(err.Error(), "23505") {
			s.logger.Warn("User creation race condition detected", zap.String("email", email))
			return s.repo.FindByEmail(ctx, email)
		}
		return nil, fmt.Errorf("save user: %w", err)
	}

	return newUser, nil
}

func (s *UserService) FindOrCreateGoogleUser(ctx context.Context, email string) (*model.User, error) {
	s.logger.Info("Finding or creating Google user", zap.String("email", email))

	user, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("find user: %w", err)
	}

	if user != nil {
		s.logger.Debug("Google user found", zap.String("email", email))
		return user, nil
	}

	newUser := model.NewGoogleUser(email)
	if err := s.repo.Save(ctx, newUser); err != nil {
		var pgErr *pgconn.PgError
		if (errors.As(err, &pgErr) && pgErr.Code == "23505") || strings.Contains(err.Error(), "23505") {
			s.logger.Warn("Google user creation race condition detected", zap.String("email", email))
			return s.repo.FindByEmail(ctx, email)
		}
		return nil, fmt.Errorf("save Google user: %w", err)
	}

	s.logger.Info("New Google user created", zap.String("email", email))
	return newUser, nil
}

func (s *UserService) UpdateTelegramToken(ctx context.Context, email, token string) error {
	user, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		return err
	}
	if user == nil {
		return nil
	}
	user.TelegramToken = &token
	return s.repo.Update(ctx, user)
}

func (s *UserService) FindByTelegramToken(ctx context.Context, token string) (*model.User, error) {
	return s.repo.FindByTelegramToken(ctx, token)
}

func (s *UserService) FindByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *UserService) FindAll(ctx context.Context, limit, offset int, query string, isPremium *bool, sortBy, sortOrder string) ([]model.User, error) {
	return s.repo.FindAll(ctx, limit, offset, query, isPremium, sortBy, sortOrder)
}

func (s *UserService) CountAll(ctx context.Context, query string, isPremium *bool) (int64, error) {
	return s.repo.CountAll(ctx, query, isPremium)
}

func (s *UserService) Update(ctx context.Context, user *model.User) error {
	return s.repo.Update(ctx, user)
}
