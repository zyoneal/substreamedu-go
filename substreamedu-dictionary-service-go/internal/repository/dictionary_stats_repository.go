package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/model"
)

func (r *DictionaryRepository) SaveReviewLog(ctx context.Context, tx DB, l *model.ReviewLog) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO review_log (user_id, card_id, reviewed_at, rating, response_time_ms, 
		                       stability_before, difficulty_before, elapsed_days, scheduled_days, state)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		l.UserID, l.CardID, l.ReviewedAt, l.Rating, l.ResponseTimeMs,
		l.StabilityBefore, l.DifficultyBefore, l.ElapsedDays, l.ScheduledDays, l.State)
	return err
}

func (r *DictionaryRepository) GetUserReviewDates(ctx context.Context, userID uuid.UUID, tz string) ([]time.Time, error) {
	if tz == "" {
		tz = "UTC"
	}
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT CAST(((reviewed_at AT TIME ZONE 'UTC') AT TIME ZONE $2) AS DATE) as review_date
		FROM review_log
		WHERE user_id = $1
		ORDER BY review_date DESC`, userID, tz)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var dates []time.Time
	for rows.Next() {
		var d time.Time
		if err := rows.Scan(&d); err != nil {
			return nil, err
		}
		dates = append(dates, d)
	}
	return dates, nil
}

func (r *DictionaryRepository) GetDictionaryStats(ctx context.Context, userID uuid.UUID, dueCutoff time.Time) (*dto.DictionaryStatsDto, error) {
	todayStart := time.Date(dueCutoff.Year(), dueCutoff.Month(), dueCutoff.Day(), 0, 0, 0, 0, dueCutoff.Location())
	var stats dto.DictionaryStatsDto
	var totalNewCards int64
	err := r.db.QueryRow(ctx, `
		SELECT 
			COUNT(*) FILTER (WHERE card_type = 0) as total,
			COUNT(*) FILTER (WHERE status = 'new' AND card_type = 0) as new_words,
			COUNT(*) FILTER (WHERE status = 'new') as total_new_cards,
			COUNT(*) FILTER (WHERE status != 'new' AND card_type = 0) as learning,
			COUNT(*) FILTER (WHERE status != 'new' AND (last_reviewed IS NULL OR last_reviewed < $3) AND (
				(status = 'review' AND next_repetition_date <= $2)
				OR
				(status = 'learning' AND learning_due IS NOT NULL AND learning_due <= NOW())
				OR
				(status = 'review' AND next_repetition_date IS NULL)
			)) as due
		FROM dictionary 
		WHERE user_id = $1`, userID, dueCutoff, todayStart).Scan(&stats.TotalWords, &stats.NewWords, &totalNewCards, &stats.LearningWords, &stats.DueToday)
	if err != nil {
		return nil, err
	}

	const sessionLimit int64 = 50
	const maxNewCards int64 = 30 // 15 words * 2 cards (recognition + production)
	stats.SessionDueCards = stats.DueToday
	if stats.SessionDueCards > sessionLimit {
		stats.SessionDueCards = sessionLimit
	}

	targetNew := sessionLimit - stats.SessionDueCards
	if targetNew < 0 {
		targetNew = 0
	}
	if targetNew > maxNewCards {
		targetNew = maxNewCards
	}
	if targetNew > totalNewCards {
		targetNew = totalNewCards
	}
	stats.SessionNewCards = targetNew
	stats.SessionNewWords = (stats.SessionNewCards + 1) / 2
	stats.SessionCards = stats.SessionDueCards + stats.SessionNewCards

	return &stats, nil
}

func (r *DictionaryRepository) GetTopUsersByWordCount(ctx context.Context, limit int) ([]dto.TopUserDto, error) {
	rows, err := r.db.Query(ctx, `
		SELECT user_id, COUNT(*) as word_count 
		FROM dictionary 
		WHERE card_type = 0
		GROUP BY user_id 
		ORDER BY word_count DESC 
		LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []dto.TopUserDto
	for rows.Next() {
		var u dto.TopUserDto
		if err := rows.Scan(&u.UserID, &u.WordCount); err != nil {
			return nil, err
		}
		result = append(result, u)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *DictionaryRepository) ResetAllSRSProgress(ctx context.Context, userID uuid.UUID) (int64, error) {
	result, err := r.db.Exec(ctx, `
		UPDATE dictionary SET
			status = 'new',
			ease_factor = 2.5,
			interval = 0,
			repetition_level = 0,
			last_reviewed = NULL,
			next_repetition_date = NULL,
			difficulty_score = 0,
			lapses = 0,
			consecutive_success = 0,
			total_reviews = 0,
			correct_reviews = 0,
			hard_count = 0,
			learning_step = 0,
			learning_due = NULL,
			is_leech = false,
			stability = 0,
			retrievability = 0,
			rolling_retention = 0
		WHERE user_id = $1`, userID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

func (r *DictionaryRepository) ResetAllSRSProgressGlobal(ctx context.Context) (int64, error) {
	result, err := r.db.Exec(ctx, `
		UPDATE dictionary SET
			status = 'new',
			ease_factor = 2.5,
			interval = 0,
			repetition_level = 0,
			last_reviewed = NULL,
			next_repetition_date = NULL,
			difficulty_score = 0,
			lapses = 0,
			consecutive_success = 0,
			total_reviews = 0,
			correct_reviews = 0,
			hard_count = 0,
			learning_step = 0,
			learning_due = NULL,
			is_leech = false,
			stability = 0,
			retrievability = 0,
			rolling_retention = 0`)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
