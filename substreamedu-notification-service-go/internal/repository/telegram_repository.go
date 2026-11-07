package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/substreamedu/substreamedu-notification-service/internal/model"
)

type TelegramUserRepository interface {
	Save(ctx context.Context, user *model.TelegramUser) error
	FindByChatID(ctx context.Context, chatID int64) (*model.TelegramUser, error)
	FindAllActiveUsers(ctx context.Context) ([]model.TelegramUser, error)
	UpdateActivity(ctx context.Context, chatID int64) error
	Deactivate(ctx context.Context, chatID int64) error
}

type telegramUserRepository struct {
	pool *pgxpool.Pool
}

func NewTelegramUserRepository(pool *pgxpool.Pool) TelegramUserRepository {
	return &telegramUserRepository{pool: pool}
}

func (r *telegramUserRepository) Save(ctx context.Context, user *model.TelegramUser) error {
	const query = `
		INSERT INTO telegram_users (chat_id, user_id, username, first_name, last_name, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		ON CONFLICT (chat_id) 
		DO UPDATE SET 
			user_id = EXCLUDED.user_id,
			username = EXCLUDED.username,
			first_name = EXCLUDED.first_name,
			last_name = EXCLUDED.last_name,
			is_active = EXCLUDED.is_active,
			updated_at = NOW()`

	_, err := r.pool.Exec(ctx, query,
		user.ChatID,
		user.UserID,
		user.Username,
		user.FirstName,
		user.LastName,
		user.IsActive,
	)

	if err != nil {
		return fmt.Errorf("save telegram user: %w", err)
	}

	return nil
}

func (r *telegramUserRepository) FindByChatID(ctx context.Context, chatID int64) (*model.TelegramUser, error) {
	const query = `
		SELECT chat_id, user_id, username, first_name, last_name, is_active, created_at, updated_at
		FROM telegram_users
		WHERE chat_id = $1`

	var user model.TelegramUser
	err := r.pool.QueryRow(ctx, query, chatID).Scan(
		&user.ChatID,
		&user.UserID,
		&user.Username,
		&user.FirstName,
		&user.LastName,
		&user.IsActive,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("find telegram user by chat_id: %w", err)
	}

	return &user, nil
}

func (r *telegramUserRepository) FindAllActiveUsers(ctx context.Context) ([]model.TelegramUser, error) {
	const query = `
		SELECT chat_id, user_id, username, first_name, last_name, is_active, created_at, updated_at
		FROM telegram_users
		WHERE is_active = TRUE
		ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query all active telegram users: %w", err)
	}
	defer rows.Close()

	var users []model.TelegramUser
	for rows.Next() {
		var user model.TelegramUser
		err := rows.Scan(
			&user.ChatID,
			&user.UserID,
			&user.Username,
			&user.FirstName,
			&user.LastName,
			&user.IsActive,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan telegram user: %w", err)
		}
		users = append(users, user)
	}

	return users, nil
}

func (r *telegramUserRepository) UpdateActivity(ctx context.Context, chatID int64) error {
	const query = `
		UPDATE telegram_users
		SET updated_at = NOW()
		WHERE chat_id = $1`

	_, err := r.pool.Exec(ctx, query, chatID)
	if err != nil {
		return fmt.Errorf("update telegram user activity: %w", err)
	}

	return nil
}

func (r *telegramUserRepository) Deactivate(ctx context.Context, chatID int64) error {
	const query = `
		UPDATE telegram_users
		SET is_active = FALSE, updated_at = NOW()
		WHERE chat_id = $1`

	_, err := r.pool.Exec(ctx, query, chatID)
	if err != nil {
		return fmt.Errorf("deactivate telegram user: %w", err)
	}

	return nil
}
