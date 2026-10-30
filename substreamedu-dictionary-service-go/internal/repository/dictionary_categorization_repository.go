package repository

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/model"
)

func (r *DictionaryRepository) FindUncategorizedLexemes(ctx context.Context, userID uuid.UUID, limit int) ([]model.Dictionary, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, highlighted_text, translated_text, transcription, context, resource_name, status, 
		       ease_factor, interval, repetition_level, last_reviewed, next_repetition_date, 
		       created_on, difficulty_score, lapses, consecutive_success, 
		       total_reviews, correct_reviews, hard_count, learning_step, learning_due,
		       COALESCE(definition, ''), COALESCE(image_url, ''), is_leech, stability, retrievability, rolling_retention, card_type, COALESCE(category, '')
		FROM dictionary 
		WHERE user_id = $1 AND (category IS NULL OR category = '') AND card_type = 0
		ORDER BY id ASC
		LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.Dictionary
	for rows.Next() {
		var d model.Dictionary
		if err := rows.Scan(
			&d.ID, &d.UserID, &d.Word, &d.Translation, &d.Transcription, &d.Context, &d.Source, &d.Status,
			&d.EaseFactor, &d.Interval, &d.RepetitionLevel, &d.LastReviewed, &d.NextRepetitionDate,
			&d.CreatedAt, &d.DifficultyScore, &d.Lapses, &d.ConsecutiveSuccess,
			&d.TotalReviews, &d.CorrectReviews, &d.HardCount, &d.LearningStep, &d.LearningDue,
			&d.Definition, &d.ImageUrl, &d.IsLeech, &d.Stability, &d.Retrievability, &d.RollingRetention, &d.CardType, &d.Category,
		); err != nil {
			return nil, err
		}
		result = append(result, d)
	}
	return result, nil
}

func (r *DictionaryRepository) CountCategorizationStats(ctx context.Context, userID uuid.UUID) (int, int, error) {
	var uncategorized, total int
	err := r.db.QueryRow(ctx, `
		SELECT 
			COUNT(*) FILTER (WHERE category IS NULL OR category = '') as uncategorized,
			COUNT(*) as total
		FROM dictionary 
		WHERE user_id = $1 AND card_type = 0`, userID).Scan(&uncategorized, &total)
	return uncategorized, total, err
}

func (r *DictionaryRepository) FindGlobalPhraseCategories(ctx context.Context, phrases []string) (map[string]string, error) {
	result := make(map[string]string)
	if len(phrases) == 0 {
		return result, nil
	}
	lowerPhrases := make([]string, 0, len(phrases))
	for _, p := range phrases {
		clean := strings.ToLower(strings.TrimSpace(p))
		if clean != "" {
			lowerPhrases = append(lowerPhrases, clean)
		}
	}
	if len(lowerPhrases) == 0 {
		return result, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT LOWER(phrase), category_name 
		FROM global_phrase_categories 
		WHERE LOWER(phrase) = ANY($1)`, lowerPhrases)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var phrase, category string
		if err := rows.Scan(&phrase, &category); err != nil {
			return nil, err
		}
		result[phrase] = category
	}
	return result, nil
}

func (r *DictionaryRepository) SaveGlobalPhraseCategories(ctx context.Context, items map[string]string) error {
	if len(items) == 0 {
		return nil
	}
	for phrase, cat := range items {
		cleanPhrase := strings.TrimSpace(phrase)
		cleanCat := strings.TrimSpace(cat)
		if cleanPhrase == "" || cleanCat == "" {
			continue
		}
		_, _ = r.db.Exec(ctx, `
			INSERT INTO global_phrase_categories (phrase, category_id, category_name)
			VALUES ($1, 0, $2)
			ON CONFLICT (phrase) DO NOTHING`, cleanPhrase, cleanCat)
	}
	return nil
}

func (r *DictionaryRepository) BatchUpdateCategories(ctx context.Context, userID uuid.UUID, updates map[int64]string) error {
	if len(updates) == 0 {
		return nil
	}
	for id, category := range updates {
		var word string
		err := r.db.QueryRow(ctx, `
			UPDATE dictionary 
			SET category = $1 
			WHERE id = $2 AND user_id = $3
			RETURNING highlighted_text`, category, id, userID).Scan(&word)
		if err == nil && word != "" {
			_, _ = r.db.Exec(ctx, `
				UPDATE dictionary 
				SET category = $1 
				WHERE user_id = $2 AND highlighted_text = $3 AND card_type = 1`, category, userID, word)
		}
	}
	return nil
}

func (r *DictionaryRepository) FindVocabularyCategories(ctx context.Context, userID uuid.UUID) ([]model.CategoryGroup, error) {
	rows, err := r.db.Query(ctx, `
		SELECT COALESCE(NULLIF(category, ''), 'Uncategorized') as name, COUNT(*) as count 
		FROM dictionary 
		WHERE user_id = $1 AND card_type = 0
		GROUP BY 1
		ORDER BY count DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.CategoryGroup
	for rows.Next() {
		var g model.CategoryGroup
		if err := rows.Scan(&g.Name, &g.Count); err != nil {
			return nil, err
		}
		result = append(result, g)
	}
	return result, nil
}

func (r *DictionaryRepository) FindLexemesByCategoryPaginated(ctx context.Context, userID uuid.UUID, category string, cursor int64, limit int) ([]model.Dictionary, bool, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}

	var rows pgx.Rows
	var err error

	if category == "Uncategorized" || category == "" {
		rows, err = r.db.Query(ctx, `
			SELECT id, user_id, highlighted_text, translated_text, transcription, context, resource_name, status, 
			       ease_factor, interval, repetition_level, last_reviewed, next_repetition_date, 
			       created_on, difficulty_score, lapses, consecutive_success, 
			       total_reviews, correct_reviews, hard_count, learning_step, learning_due,
			       COALESCE(definition, ''), COALESCE(image_url, ''), is_leech, stability, retrievability, rolling_retention, card_type, COALESCE(category, '')
			FROM dictionary 
			WHERE user_id = $1 AND (category IS NULL OR category = '') AND id > $2 AND card_type = 0
			ORDER BY id ASC
			LIMIT $3`, userID, cursor, limit+1)
	} else {
		rows, err = r.db.Query(ctx, `
			SELECT id, user_id, highlighted_text, translated_text, transcription, context, resource_name, status, 
			       ease_factor, interval, repetition_level, last_reviewed, next_repetition_date, 
			       created_on, difficulty_score, lapses, consecutive_success, 
			       total_reviews, correct_reviews, hard_count, learning_step, learning_due,
			       COALESCE(definition, ''), COALESCE(image_url, ''), is_leech, stability, retrievability, rolling_retention, card_type, COALESCE(category, '')
			FROM dictionary 
			WHERE user_id = $1 AND category = $2 AND id > $3 AND card_type = 0
			ORDER BY id ASC
			LIMIT $4`, userID, category, cursor, limit+1)
	}

	if err != nil {
		return nil, false, err
	}
	defer rows.Close()

	var result []model.Dictionary
	for rows.Next() {
		var d model.Dictionary
		if err := rows.Scan(
			&d.ID, &d.UserID, &d.Word, &d.Translation, &d.Transcription, &d.Context, &d.Source, &d.Status,
			&d.EaseFactor, &d.Interval, &d.RepetitionLevel, &d.LastReviewed, &d.NextRepetitionDate,
			&d.CreatedAt, &d.DifficultyScore, &d.Lapses, &d.ConsecutiveSuccess,
			&d.TotalReviews, &d.CorrectReviews, &d.HardCount, &d.LearningStep, &d.LearningDue,
			&d.Definition, &d.ImageUrl, &d.IsLeech, &d.Stability, &d.Retrievability, &d.RollingRetention, &d.CardType, &d.Category,
		); err != nil {
			return nil, false, err
		}
		result = append(result, d)
	}

	hasMore := len(result) > limit
	if hasMore {
		result = result[:limit]
	}
	return result, hasMore, nil
}
