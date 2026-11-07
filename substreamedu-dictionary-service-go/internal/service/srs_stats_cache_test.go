package service

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
)

func TestSRSStats_Serialization(t *testing.T) {
	stats := &dto.DictionaryStatsDto{
		TotalWords:      1200,
		NewWords:        150,
		LearningWords:   45,
		DueToday:        12,
		SessionCards:    50,
		SessionDueCards: 12,
		SessionNewCards: 38,
		SessionNewWords: 19,
		StreakDays:      7,
		ReviewedToday:   true,
	}

	data, err := json.Marshal(stats)
	assert.NoError(t, err)

	var restored dto.DictionaryStatsDto
	err = json.Unmarshal(data, &restored)
	assert.NoError(t, err)
	assert.Equal(t, stats.TotalWords, restored.TotalWords)
	assert.Equal(t, stats.StreakDays, restored.StreakDays)
	assert.Equal(t, stats.ReviewedToday, restored.ReviewedToday)
	assert.Equal(t, stats.DueToday, restored.DueToday)
	assert.Equal(t, stats.SessionCards, restored.SessionCards)
}

func TestSRSStats_CacheNilSafety(t *testing.T) {
	vs := &VocabularyService{
		redis: nil,
	}

	testUserID := uuid.New()
	assert.NotPanics(t, func() {
		vs.InvalidateSRSStatsCache(context.Background(), testUserID)
	})

	ls := &LearningService{
		redis: nil,
	}
	assert.NotPanics(t, func() {
		ls.InvalidateCache(context.Background(), testUserID)
		_ = ls.RefreshSession(context.Background(), testUserID)
	})
}
