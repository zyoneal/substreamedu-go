package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	json "github.com/goccy/go-json"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
)

type LessonRepository struct {
	db *pgxpool.Pool
}

func NewLessonRepository(db *pgxpool.Pool) *LessonRepository {
	return &LessonRepository{db: db}
}

// generateShareToken produces a random 12-byte hex token (24 chars)
func generateShareToken() string {
	bytes := make([]byte, 12)
	if _, err := rand.Read(bytes); err != nil {
		return uuid.New().String()[:24]
	}
	return hex.EncodeToString(bytes)
}

// CreateLesson stores a new lesson and returns the created response with share_token
func (r *LessonRepository) CreateLesson(ctx context.Context, userID *string, req dto.SaveLessonRequest) (*dto.LessonResponse, error) {
	contentBytes, err := json.Marshal(req.Content)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal lesson content: %w", err)
	}

	shareToken := generateShareToken()
	now := time.Now()

	var newID uuid.UUID
	var userUUID *uuid.UUID
	if userID != nil && *userID != "" {
		parsed, err := uuid.Parse(*userID)
		if err == nil {
			userUUID = &parsed
		}
	}

	query := `
		INSERT INTO lessons (user_id, share_token, title, target_level, media_source, youtube_id, content, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`

	err = r.db.QueryRow(ctx, query,
		userUUID,
		shareToken,
		req.Title,
		req.TargetLevel,
		req.MediaSource,
		req.YoutubeID,
		contentBytes,
		now,
		now,
	).Scan(&newID, &now, &now)

	if err != nil {
		return nil, fmt.Errorf("failed to insert lesson: %w", err)
	}

	var userStr *string
	if userUUID != nil {
		str := userUUID.String()
		userStr = &str
	}

	return &dto.LessonResponse{
		ID:          newID.String(),
		UserID:      userStr,
		ShareToken:  shareToken,
		Title:       req.Title,
		TargetLevel: req.TargetLevel,
		MediaSource: req.MediaSource,
		YoutubeID:   req.YoutubeID,
		Content:     req.Content,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}

// GetByShareToken retrieves a lesson by its public share token (accessible without authentication)
func (r *LessonRepository) GetByShareToken(ctx context.Context, shareToken string) (*dto.LessonResponse, error) {
	query := `
		SELECT id, user_id, share_token, title, target_level, media_source, youtube_id, content, created_at, updated_at
		FROM lessons
		WHERE share_token = $1
	`

	var id uuid.UUID
	var userUUID *uuid.UUID
	var token, title, targetLevel, mediaSource, youtubeID string
	var contentBytes []byte
	var createdAt, updatedAt time.Time

	err := r.db.QueryRow(ctx, query, shareToken).Scan(
		&id, &userUUID, &token, &title, &targetLevel, &mediaSource, &youtubeID, &contentBytes, &createdAt, &updatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query lesson by share_token: %w", err)
	}

	var plan dto.LessonPlan
	if err := json.Unmarshal(contentBytes, &plan); err != nil {
		return nil, fmt.Errorf("failed to unmarshal lesson content: %w", err)
	}

	var userStr *string
	if userUUID != nil {
		str := userUUID.String()
		userStr = &str
	}

	return &dto.LessonResponse{
		ID:          id.String(),
		UserID:      userStr,
		ShareToken:  token,
		Title:       title,
		TargetLevel: targetLevel,
		MediaSource: mediaSource,
		YoutubeID:   youtubeID,
		Content:     plan,
		CreatedAt:   createdAt,
		UpdatedAt:   updatedAt,
	}, nil
}

// GetByUserID retrieves all lessons created by a specific authenticated user
func (r *LessonRepository) GetByUserID(ctx context.Context, userID string) ([]dto.LessonResponse, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user_id: %w", err)
	}

	query := `
		SELECT id, user_id, share_token, title, target_level, media_source, youtube_id, content, created_at, updated_at
		FROM lessons
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(ctx, query, userUUID)
	if err != nil {
		return nil, fmt.Errorf("failed to query lessons by user_id: %w", err)
	}
	defer rows.Close()

	var results []dto.LessonResponse
	for rows.Next() {
		var id uuid.UUID
		var uUUID *uuid.UUID
		var token, title, targetLevel, mediaSource, youtubeID string
		var contentBytes []byte
		var createdAt, updatedAt time.Time

		if err := rows.Scan(&id, &uUUID, &token, &title, &targetLevel, &mediaSource, &youtubeID, &contentBytes, &createdAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan lesson row: %w", err)
		}

		var plan dto.LessonPlan
		_ = json.Unmarshal(contentBytes, &plan)

		var userStr *string
		if uUUID != nil {
			str := uUUID.String()
			userStr = &str
		}

		results = append(results, dto.LessonResponse{
			ID:          id.String(),
			UserID:      userStr,
			ShareToken:  token,
			Title:       title,
			TargetLevel: targetLevel,
			MediaSource: mediaSource,
			YoutubeID:   youtubeID,
			Content:     plan,
			CreatedAt:   createdAt,
			UpdatedAt:   updatedAt,
		})
	}

	return results, nil
}

// DeleteByID removes a lesson if it belongs to the given user
func (r *LessonRepository) DeleteByID(ctx context.Context, lessonID string, userID string) error {
	idUUID, err := uuid.Parse(lessonID)
	if err != nil {
		return fmt.Errorf("invalid lesson_id: %w", err)
	}
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("invalid user_id: %w", err)
	}

	query := `DELETE FROM lessons WHERE id = $1 AND user_id = $2`
	tag, err := r.db.Exec(ctx, query, idUUID, userUUID)
	if err != nil {
		return fmt.Errorf("failed to delete lesson: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return errors.New("lesson not found or not owned by user")
	}
	return nil
}
