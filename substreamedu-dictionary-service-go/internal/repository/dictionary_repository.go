package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/model"
)

type DictionaryRepository struct {
	db *pgxpool.Pool
}

func NewDictionaryRepository(db *pgxpool.Pool) *DictionaryRepository {
	return &DictionaryRepository{db: db}
}

func (r *DictionaryRepository) FindByID(ctx context.Context, id int64) (*model.Dictionary, error) {
	var d model.Dictionary
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, highlighted_text, translated_text, transcription, context, resource_name, status, 
		       ease_factor, interval, repetition_level, last_reviewed, next_repetition_date, 
		       created_on, difficulty_score, lapses, consecutive_success, 
		       total_reviews, correct_reviews, hard_count, learning_step, learning_due,
		       COALESCE(definition, ''), COALESCE(image_url, ''), is_leech, stability, retrievability, rolling_retention, card_type
		FROM dictionary WHERE id = $1`, id).Scan(
		&d.ID, &d.UserID, &d.Word, &d.Translation, &d.Transcription, &d.Context, &d.Source, &d.Status,
		&d.EaseFactor, &d.Interval, &d.RepetitionLevel, &d.LastReviewed, &d.NextRepetitionDate,
		&d.CreatedAt, &d.DifficultyScore, &d.Lapses, &d.ConsecutiveSuccess,
		&d.TotalReviews, &d.CorrectReviews, &d.HardCount, &d.LearningStep, &d.LearningDue, &d.Definition, &d.ImageUrl, &d.IsLeech,
		&d.Stability, &d.Retrievability, &d.RollingRetention, &d.CardType,
	)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *DictionaryRepository) Save(ctx context.Context, d *model.Dictionary) error {
	if d.ID == 0 {
		return r.db.QueryRow(ctx, `
			INSERT INTO dictionary (user_id, highlighted_text, translated_text, transcription, context, resource_name, status, 
			       ease_factor, interval, repetition_level, last_reviewed, next_repetition_date, 
			       created_on, difficulty_score, lapses, consecutive_success, 
			       total_reviews, correct_reviews, hard_count, learning_step, learning_due, definition, image_url, is_leech, stability, retrievability, rolling_retention, card_type)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
			RETURNING id`,
			d.UserID, d.Word, d.Translation, d.Transcription, d.Context, d.Source, d.Status,
			d.EaseFactor, d.Interval, d.RepetitionLevel, d.LastReviewed, d.NextRepetitionDate,
			time.Now(), d.DifficultyScore, d.Lapses, d.ConsecutiveSuccess,
			d.TotalReviews, d.CorrectReviews, d.HardCount, d.LearningStep, d.LearningDue, d.Definition, d.ImageUrl, d.IsLeech, d.Stability, d.Retrievability, d.RollingRetention, d.CardType,
		).Scan(&d.ID)
	}

	result, err := r.db.Exec(ctx, `
		UPDATE dictionary SET 
			status=$1, ease_factor=$2, interval=$3, repetition_level=$4, last_reviewed=$5, 
			next_repetition_date=$6, difficulty_score=$7, lapses=$8, 
			consecutive_success=$9, total_reviews=$10, correct_reviews=$11, hard_count=$12, 
			learning_step=$13, learning_due=$14, definition=$15, image_url=$16, is_leech=$17,
			stability=$18, retrievability=$19, rolling_retention=$20, card_type=$21
		WHERE id = $22`,
		d.Status, d.EaseFactor, d.Interval, d.RepetitionLevel, d.LastReviewed,
		d.NextRepetitionDate, d.DifficultyScore, d.Lapses,
		d.ConsecutiveSuccess, d.TotalReviews, d.CorrectReviews, d.HardCount,
		d.LearningStep, d.LearningDue, d.Definition, d.ImageUrl, d.IsLeech,
		d.Stability, d.Retrievability, d.RollingRetention, d.CardType, d.ID,
	)
	if err == nil {
		rows := result.RowsAffected()
		if rows == 0 {
			return fmt.Errorf("zero rows affected when updating card %d", d.ID)
		}
	}
	return err
}

func (r *DictionaryRepository) SaveTx(ctx context.Context, tx DB, d *model.Dictionary) error {
	result, err := tx.Exec(ctx, `
		UPDATE dictionary SET 
			status=$1, ease_factor=$2, interval=$3, repetition_level=$4, last_reviewed=$5, 
			next_repetition_date=$6, difficulty_score=$7, lapses=$8, 
			consecutive_success=$9, total_reviews=$10, correct_reviews=$11, hard_count=$12, 
			learning_step=$13, learning_due=$14, definition=$15, image_url=$16, is_leech=$17,
			stability=$18, retrievability=$19, rolling_retention=$20, card_type=$21
		WHERE id = $22`,
		d.Status, d.EaseFactor, d.Interval, d.RepetitionLevel, d.LastReviewed,
		d.NextRepetitionDate, d.DifficultyScore, d.Lapses,
		d.ConsecutiveSuccess, d.TotalReviews, d.CorrectReviews, d.HardCount,
		d.LearningStep, d.LearningDue, d.Definition, d.ImageUrl, d.IsLeech,
		d.Stability, d.Retrievability, d.RollingRetention, d.CardType, d.ID,
	)
	if err == nil {
		rows := result.RowsAffected()
		if rows == 0 {
			return fmt.Errorf("zero rows affected when updating card %d", d.ID)
		}
	}
	return err
}

func (r *DictionaryRepository) SaveTxOptimistic(ctx context.Context, tx DB, d *model.Dictionary, expectedTotalReviews int) error {
	result, err := tx.Exec(ctx, `
		UPDATE dictionary SET 
			status=$1, ease_factor=$2, interval=$3, repetition_level=$4, last_reviewed=$5, 
			next_repetition_date=$6, difficulty_score=$7, lapses=$8, 
			consecutive_success=$9, total_reviews=$10, correct_reviews=$11, hard_count=$12, 
			learning_step=$13, learning_due=$14, definition=$15, image_url=$16, is_leech=$17,
			stability=$18, retrievability=$19, rolling_retention=$20, card_type=$21
		WHERE id = $22 AND total_reviews = $23`,
		d.Status, d.EaseFactor, d.Interval, d.RepetitionLevel, d.LastReviewed,
		d.NextRepetitionDate, d.DifficultyScore, d.Lapses,
		d.ConsecutiveSuccess, d.TotalReviews, d.CorrectReviews, d.HardCount,
		d.LearningStep, d.LearningDue, d.Definition, d.ImageUrl, d.IsLeech,
		d.Stability, d.Retrievability, d.RollingRetention, d.CardType, d.ID,
		expectedTotalReviews,
	)
	if err != nil {
		return err
	}
	rows := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("concurrent modification detected for card %d: expected total_reviews=%d", d.ID, expectedTotalReviews)
	}
	return nil
}

func (r *DictionaryRepository) FindDueWordsSorted(ctx context.Context, userID uuid.UUID, todayStart time.Time, dueCutoff time.Time, limit int) ([]model.Dictionary, error) {

	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, highlighted_text, translated_text, transcription, context, resource_name, status, 
		       ease_factor, interval, repetition_level, last_reviewed, next_repetition_date, 
		       created_on, difficulty_score, lapses, consecutive_success, 
		       total_reviews, correct_reviews, hard_count, learning_step, learning_due,
		       COALESCE(definition, ''), COALESCE(image_url, ''), is_leech, stability, retrievability, rolling_retention, card_type
		FROM dictionary 
		WHERE user_id = $1
		  AND status != 'new'
		  AND (last_reviewed IS NULL OR last_reviewed < $2)
		  AND (
		      (status = 'review' AND next_repetition_date <= $3)
		      OR 
		      (status = 'learning' AND learning_due IS NOT NULL AND learning_due <= NOW())
		      OR
		      (status = 'review' AND next_repetition_date IS NULL)
		  )
		ORDER BY 
		      CASE 
		          WHEN status = 'review' AND next_repetition_date IS NULL THEN 0
		          WHEN status = 'learning' THEN 1
		          ELSE 2
		      END ASC,
		      CASE 
		          WHEN status = 'review' AND next_repetition_date < $2 THEN 0
		          ELSE 1 
		      END ASC,
		      next_repetition_date ASC NULLS FIRST,
		      difficulty_score DESC
		LIMIT $4`, userID, todayStart, dueCutoff, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.Dictionary
	for rows.Next() {
		var d model.Dictionary
		err := rows.Scan(
			&d.ID, &d.UserID, &d.Word, &d.Translation, &d.Transcription, &d.Context, &d.Source, &d.Status,
			&d.EaseFactor, &d.Interval, &d.RepetitionLevel, &d.LastReviewed, &d.NextRepetitionDate,
			&d.CreatedAt, &d.DifficultyScore, &d.Lapses, &d.ConsecutiveSuccess,
			&d.TotalReviews, &d.CorrectReviews, &d.HardCount, &d.LearningStep, &d.LearningDue, &d.Definition, &d.ImageUrl, &d.IsLeech,
			&d.Stability, &d.Retrievability, &d.RollingRetention, &d.CardType,
		)
		if err != nil {
			return nil, err
		}
		result = append(result, d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *DictionaryRepository) FindRandomNewWords(ctx context.Context, userID uuid.UUID, limit int) ([]model.Dictionary, error) {

	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, highlighted_text, translated_text, transcription, context, resource_name, status, 
		       ease_factor, interval, repetition_level, last_reviewed, next_repetition_date, 
		       created_on, difficulty_score, lapses, consecutive_success, 
		       total_reviews, correct_reviews, hard_count, learning_step, learning_due,
		       COALESCE(definition, ''), COALESCE(image_url, ''), is_leech, stability, retrievability, rolling_retention, card_type
		FROM dictionary 
		WHERE user_id = $1 AND status = 'new'
		ORDER BY created_on DESC
		LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.Dictionary
	for rows.Next() {
		var d model.Dictionary
		err := rows.Scan(
			&d.ID, &d.UserID, &d.Word, &d.Translation, &d.Transcription, &d.Context, &d.Source, &d.Status,
			&d.EaseFactor, &d.Interval, &d.RepetitionLevel, &d.LastReviewed, &d.NextRepetitionDate,
			&d.CreatedAt, &d.DifficultyScore, &d.Lapses, &d.ConsecutiveSuccess,
			&d.TotalReviews, &d.CorrectReviews, &d.HardCount, &d.LearningStep, &d.LearningDue, &d.Definition, &d.ImageUrl, &d.IsLeech,
			&d.Stability, &d.Retrievability, &d.RollingRetention, &d.CardType,
		)
		if err != nil {
			return nil, err
		}
		result = append(result, d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *DictionaryRepository) FindRandomWord(ctx context.Context, userID uuid.UUID) (*model.Dictionary, error) {
	var d model.Dictionary
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, highlighted_text, translated_text, transcription, context, resource_name, status, 
		       ease_factor, interval, repetition_level, last_reviewed, next_repetition_date, 
		       created_on, difficulty_score, lapses, consecutive_success, 
		       total_reviews, correct_reviews, hard_count, learning_step, learning_due,
		       COALESCE(definition, ''), COALESCE(image_url, ''), is_leech, stability, retrievability, rolling_retention, card_type
		FROM dictionary 
		WHERE user_id = $1 AND card_type = 0
		ORDER BY RANDOM()
		LIMIT 1`, userID).Scan(
		&d.ID, &d.UserID, &d.Word, &d.Translation, &d.Transcription, &d.Context, &d.Source, &d.Status,
		&d.EaseFactor, &d.Interval, &d.RepetitionLevel, &d.LastReviewed, &d.NextRepetitionDate,
		&d.CreatedAt, &d.DifficultyScore, &d.Lapses, &d.ConsecutiveSuccess,
		&d.TotalReviews, &d.CorrectReviews, &d.HardCount, &d.LearningStep, &d.LearningDue, &d.Definition, &d.ImageUrl, &d.IsLeech,
		&d.Stability, &d.Retrievability, &d.RollingRetention, &d.CardType,
	)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *DictionaryRepository) FindVocabularyGroups(ctx context.Context, userID uuid.UUID) ([]model.DictionaryGroup, error) {
	rows, err := r.db.Query(ctx, `
		SELECT resource_name as name, COUNT(*) as count 
		FROM dictionary 
		WHERE user_id = $1 AND card_type = 0
		GROUP BY resource_name
		ORDER BY count DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.DictionaryGroup
	for rows.Next() {
		var g model.DictionaryGroup
		if err := rows.Scan(&g.Name, &g.Count); err != nil {
			return nil, err
		}
		result = append(result, g)
	}
	return result, nil
}

func (r *DictionaryRepository) FindLexemesByResourcePaginated(ctx context.Context, userID uuid.UUID, resourceName string, cursor int64, limit int) ([]model.Dictionary, bool, error) {

	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, highlighted_text, translated_text, transcription, context, resource_name, status, 
		       ease_factor, interval, repetition_level, last_reviewed, next_repetition_date, 
		       created_on, difficulty_score, lapses, consecutive_success, 
		       total_reviews, correct_reviews, hard_count, learning_step, learning_due,
		       COALESCE(definition, ''), COALESCE(image_url, ''), is_leech, stability, retrievability, rolling_retention, card_type
		FROM dictionary 
		WHERE user_id = $1 AND resource_name ILIKE '%' || $2 || '%' AND id > $3 AND card_type = 0
		ORDER BY id ASC
		LIMIT $4`, userID, resourceName, cursor, limit+1)
	if err != nil {
		return nil, false, err
	}
	defer rows.Close()

	var result []model.Dictionary
	for rows.Next() {
		var d model.Dictionary
		err := rows.Scan(
			&d.ID, &d.UserID, &d.Word, &d.Translation, &d.Transcription, &d.Context, &d.Source, &d.Status,
			&d.EaseFactor, &d.Interval, &d.RepetitionLevel, &d.LastReviewed, &d.NextRepetitionDate,
			&d.CreatedAt, &d.DifficultyScore, &d.Lapses, &d.ConsecutiveSuccess,
			&d.TotalReviews, &d.CorrectReviews, &d.HardCount, &d.LearningStep, &d.LearningDue, &d.Definition, &d.ImageUrl, &d.IsLeech,
			&d.Stability, &d.Retrievability, &d.RollingRetention, &d.CardType,
		)
		if err != nil {
			return nil, false, err
		}
		result = append(result, d)
	}

	if err := rows.Err(); err != nil {
		return nil, false, err
	}

	hasMore := len(result) > limit
	if hasMore {
		result = result[:limit]
	}
	return result, hasMore, nil
}

func (r *DictionaryRepository) CountLexemesByResource(ctx context.Context, userID uuid.UUID, resourceName string) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM dictionary WHERE user_id = $1 AND resource_name ILIKE '%' || $2 || '%' AND card_type = 0`, userID, resourceName).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (r *DictionaryRepository) FindLexemesByResource(ctx context.Context, userID uuid.UUID, resourceName string) ([]model.Dictionary, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, highlighted_text, translated_text, transcription, context, resource_name, status, 
		       ease_factor, interval, repetition_level, last_reviewed, next_repetition_date, 
		       created_on, difficulty_score, lapses, consecutive_success, 
		       total_reviews, correct_reviews, hard_count, learning_step, learning_due,
		       COALESCE(definition, ''), COALESCE(image_url, ''), is_leech, stability, retrievability, rolling_retention, card_type
		FROM dictionary 
		WHERE user_id = $1 AND resource_name ILIKE '%' || $2 || '%' AND card_type = 0
		ORDER BY id ASC`, userID, resourceName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.Dictionary
	for rows.Next() {
		var d model.Dictionary
		err := rows.Scan(
			&d.ID, &d.UserID, &d.Word, &d.Translation, &d.Transcription, &d.Context, &d.Source, &d.Status,
			&d.EaseFactor, &d.Interval, &d.RepetitionLevel, &d.LastReviewed, &d.NextRepetitionDate,
			&d.CreatedAt, &d.DifficultyScore, &d.Lapses, &d.ConsecutiveSuccess,
			&d.TotalReviews, &d.CorrectReviews, &d.HardCount, &d.LearningStep, &d.LearningDue, &d.Definition, &d.ImageUrl, &d.IsLeech,
			&d.Stability, &d.Retrievability, &d.RollingRetention, &d.CardType,
		)
		if err != nil {
			return nil, err
		}
		result = append(result, d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *DictionaryRepository) FindAllLexemes(ctx context.Context, userID uuid.UUID) ([]model.Dictionary, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, highlighted_text, translated_text, transcription, context, resource_name, status, 
		       ease_factor, interval, repetition_level, last_reviewed, next_repetition_date, 
		       created_on, difficulty_score, lapses, consecutive_success, 
		       total_reviews, correct_reviews, hard_count, learning_step, learning_due,
		       COALESCE(definition, ''), COALESCE(image_url, ''), is_leech, stability, retrievability, rolling_retention, card_type
		FROM dictionary 
		WHERE user_id = $1 AND card_type = 0`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.Dictionary
	for rows.Next() {
		var d model.Dictionary
		err := rows.Scan(
			&d.ID, &d.UserID, &d.Word, &d.Translation, &d.Transcription, &d.Context, &d.Source, &d.Status,
			&d.EaseFactor, &d.Interval, &d.RepetitionLevel, &d.LastReviewed, &d.NextRepetitionDate,
			&d.CreatedAt, &d.DifficultyScore, &d.Lapses, &d.ConsecutiveSuccess,
			&d.TotalReviews, &d.CorrectReviews, &d.HardCount, &d.LearningStep, &d.LearningDue, &d.Definition, &d.ImageUrl, &d.IsLeech,
			&d.Stability, &d.Retrievability, &d.RollingRetention, &d.CardType,
		)
		if err != nil {
			return nil, err
		}
		result = append(result, d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *DictionaryRepository) FindAllLexemesPaginated(ctx context.Context, userID uuid.UUID, cursor int64, limit int) ([]model.Dictionary, bool, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, highlighted_text, translated_text, transcription, context, resource_name, status, 
		       ease_factor, interval, repetition_level, last_reviewed, next_repetition_date, 
		       created_on, difficulty_score, lapses, consecutive_success, 
		       total_reviews, correct_reviews, hard_count, learning_step, learning_due,
		       COALESCE(definition, ''), COALESCE(image_url, ''), is_leech, stability, retrievability, rolling_retention, card_type
		FROM dictionary 
		WHERE user_id = $1 AND card_type = 0 AND id > $2
		ORDER BY id ASC
		LIMIT $3`, userID, cursor, limit+1)
	if err != nil {
		return nil, false, err
	}
	defer rows.Close()

	var result []model.Dictionary
	for rows.Next() {
		var d model.Dictionary
		err := rows.Scan(
			&d.ID, &d.UserID, &d.Word, &d.Translation, &d.Transcription, &d.Context, &d.Source, &d.Status,
			&d.EaseFactor, &d.Interval, &d.RepetitionLevel, &d.LastReviewed, &d.NextRepetitionDate,
			&d.CreatedAt, &d.DifficultyScore, &d.Lapses, &d.ConsecutiveSuccess,
			&d.TotalReviews, &d.CorrectReviews, &d.HardCount, &d.LearningStep, &d.LearningDue, &d.Definition, &d.ImageUrl, &d.IsLeech,
			&d.Stability, &d.Retrievability, &d.RollingRetention, &d.CardType,
		)
		if err != nil {
			return nil, false, err
		}
		result = append(result, d)
	}
	if err := rows.Err(); err != nil {
		return nil, false, err
	}

	hasMore := len(result) > limit
	if hasMore {
		result = result[:limit]
	}
	return result, hasMore, nil
}

func (r *DictionaryRepository) FindAllLexemesLightPaginated(ctx context.Context, userID uuid.UUID, cursor int64, limit int) ([]dto.LexemeLightDto, bool, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, highlighted_text, translated_text, COALESCE(definition, ''), card_type
		FROM dictionary 
		WHERE user_id = $1 AND card_type = 0 AND id > $2
		ORDER BY id ASC
		LIMIT $3`, userID, cursor, limit+1)
	if err != nil {
		return nil, false, err
	}
	defer rows.Close()

	var result []dto.LexemeLightDto
	for rows.Next() {
		var d dto.LexemeLightDto
		err := rows.Scan(&d.ID, &d.HighlightedText, &d.TranslatedText, &d.Definition, &d.CardType)
		if err != nil {
			return nil, false, err
		}
		result = append(result, d)
	}
	if err := rows.Err(); err != nil {
		return nil, false, err
	}

	hasMore := len(result) > limit
	if hasMore {
		result = result[:limit]
	}
	return result, hasMore, nil
}

func (r *DictionaryRepository) FindAllLexemesLight(ctx context.Context, userID uuid.UUID) ([]dto.LexemeLightDto, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, highlighted_text, translated_text, COALESCE(definition, ''), card_type
		FROM dictionary 
		WHERE user_id = $1 AND card_type = 0`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []dto.LexemeLightDto
	for rows.Next() {
		var d dto.LexemeLightDto
		err := rows.Scan(&d.ID, &d.HighlightedText, &d.TranslatedText, &d.Definition, &d.CardType)
		if err != nil {
			return nil, err
		}
		result = append(result, d)
	}
	return result, nil
}

func (r *DictionaryRepository) DeleteWord(ctx context.Context, userID uuid.UUID, wordID int64) error {
	_, err := r.db.Exec(ctx, "DELETE FROM dictionary WHERE id = $1 AND user_id = $2", wordID, userID)
	return err
}

func (r *DictionaryRepository) DeleteByResource(ctx context.Context, userID uuid.UUID, resourceName string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM dictionary WHERE user_id = $1 AND resource_name ILIKE '%' || $2 || '%'", userID, resourceName)
	return err
}

func (r *DictionaryRepository) CountTotalWords(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM dictionary WHERE user_id = $1 AND card_type = 0", userID).Scan(&count)
	return count, err
}

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

type DB interface {
	Exec(ctx context.Context, sql string, arguments ...any) (commandTag pgconn.CommandTag, err error)
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
	stats.SessionDueCards = stats.DueToday
	if stats.SessionDueCards > sessionLimit {
		stats.SessionDueCards = sessionLimit
	}

	targetNew := sessionLimit - stats.SessionDueCards
	if targetNew < 0 {
		targetNew = 0
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

func (r *DictionaryRepository) UpdateImageUrl(ctx context.Context, wordID int64, imageUrl string) error {
	_, err := r.db.Exec(ctx, "UPDATE dictionary SET image_url = $1 WHERE id = $2", imageUrl, wordID)
	return err
}
