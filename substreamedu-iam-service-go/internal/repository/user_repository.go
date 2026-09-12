package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/substreamedu/substreamedu-iam-service/internal/model"
)

type UserRepository interface {
	FindByID(ctx context.Context, id uuid.UUID) (*model.User, error)
	FindByEmail(ctx context.Context, email string) (*model.User, error)
	FindByTelegramToken(ctx context.Context, token string) (*model.User, error)
	Save(ctx context.Context, user *model.User) error
	Update(ctx context.Context, user *model.User) error
	FindAll(ctx context.Context, limit, offset int, query string, isPremium *bool, sortBy, sortOrder string) ([]model.User, error)
	CountAll(ctx context.Context, query string, isPremium *bool) (int64, error)
}

type userRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) UserRepository {
	return &userRepository{pool: pool}
}

func (r *userRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	const query = `
		SELECT id, email, is_active, telegram_token, is_premium, translation_count, saved_words_count, role, created_at
		FROM sse_user
		WHERE id = $1`

	var user model.User
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.IsActive,
		&user.TelegramToken,
		&user.IsPremium,
		&user.TranslationCount,
		&user.SavedWordsCount,
		&user.Role,
		&user.CreatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query user by id: %w", err)
	}

	return &user, nil
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	const query = `
		SELECT id, email, is_active, telegram_token, is_premium, translation_count, saved_words_count, role, created_at
		FROM sse_user
		WHERE LOWER(email) = LOWER($1)`

	var user model.User
	err := r.pool.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.IsActive,
		&user.TelegramToken,
		&user.IsPremium,
		&user.TranslationCount,
		&user.SavedWordsCount,
		&user.Role,
		&user.CreatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query user by email: %w", err)
	}

	return &user, nil
}

func (r *userRepository) FindByTelegramToken(ctx context.Context, token string) (*model.User, error) {
	const query = `
		SELECT id, email, is_active, telegram_token, is_premium, translation_count, saved_words_count, role, created_at
		FROM sse_user
		WHERE telegram_token = $1`

	var user model.User
	err := r.pool.QueryRow(ctx, query, token).Scan(
		&user.ID,
		&user.Email,
		&user.IsActive,
		&user.TelegramToken,
		&user.IsPremium,
		&user.TranslationCount,
		&user.SavedWordsCount,
		&user.Role,
		&user.CreatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query user by telegram token: %w", err)
	}

	return &user, nil
}

func (r *userRepository) Save(ctx context.Context, user *model.User) error {
	const query = `
		INSERT INTO sse_user (id, email, is_active, telegram_token, is_premium, translation_count, saved_words_count, role, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	_, err := r.pool.Exec(ctx, query,
		user.ID,
		user.Email,
		user.IsActive,
		user.TelegramToken,
		user.IsPremium,
		user.TranslationCount,
		user.SavedWordsCount,
		user.Role,
		user.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("insert user: %w", err)
	}

	return nil
}

func (r *userRepository) Update(ctx context.Context, user *model.User) error {
	const query = `
		UPDATE sse_user
		SET email = $2, is_active = $3, telegram_token = $4, is_premium = $5, translation_count = $6, saved_words_count = $7, role = $8
		WHERE id = $1`

	_, err := r.pool.Exec(ctx, query,
		user.ID,
		user.Email,
		user.IsActive,
		user.TelegramToken,
		user.IsPremium,
		user.TranslationCount,
		user.SavedWordsCount,
		user.Role,
	)

	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}

	return nil
}

func (r *userRepository) FindAll(ctx context.Context, limit, offset int, query string, isPremium *bool, sortBy, sortOrder string) ([]model.User, error) {
	sql := `
		SELECT id, email, is_active, telegram_token, is_premium, translation_count, saved_words_count, role, created_at
		FROM sse_user WHERE 1=1`

	var args []interface{}
	argCount := 1

	if query != "" {
		sql += fmt.Sprintf(" AND email ILIKE $%d", argCount)
		args = append(args, "%"+query+"%")
		argCount++
	}

	if isPremium != nil {
		sql += fmt.Sprintf(" AND is_premium = $%d", argCount)
		args = append(args, *isPremium)
		argCount++
	}

	allowedSortFields := map[string]string{
		"created_at":		"created_at",
		"translation_count":	"translation_count",
		"email":		"email",
	}
	sortField, ok := allowedSortFields[sortBy]
	if !ok {
		sortField = "created_at"
	}

	if strings.ToUpper(sortOrder) != "ASC" {
		sortOrder = "DESC"
	}

	sql += fmt.Sprintf(" ORDER BY %s %s LIMIT $%d OFFSET $%d", sortField, sortOrder, argCount, argCount+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("query all users: %w", err)
	}
	defer rows.Close()

	var users []model.User
	for rows.Next() {
		var u model.User
		err := rows.Scan(
			&u.ID,
			&u.Email,
			&u.IsActive,
			&u.TelegramToken,
			&u.IsPremium,
			&u.TranslationCount,
			&u.SavedWordsCount,
			&u.Role,
			&u.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}

	return users, nil
}

func (r *userRepository) CountAll(ctx context.Context, query string, isPremium *bool) (int64, error) {
	sql := `SELECT COUNT(*) FROM sse_user WHERE 1=1`
	var args []interface{}
	argCount := 1

	if query != "" {
		sql += fmt.Sprintf(" AND email ILIKE $%d", argCount)
		args = append(args, "%"+query+"%")
		argCount++
	}

	if isPremium != nil {
		sql += fmt.Sprintf(" AND is_premium = $%d", argCount)
		args = append(args, *isPremium)
		argCount++
	}

	var count int64
	err := r.pool.QueryRow(ctx, sql, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count users: %w", err)
	}
	return count, nil
}
