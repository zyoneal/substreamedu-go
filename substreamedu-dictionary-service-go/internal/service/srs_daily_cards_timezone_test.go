package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestSRSDailyCards_TimezoneCutoffComparison(t *testing.T) {
	locKyiv, err := time.LoadLocation("Europe/Kyiv")
	assert.NoError(t, err)

	// Instant: 2026-09-16 00:15:00 in UTC+3 (Kyiv/Moscow)
	// Equivalent in UTC: 2026-09-15 21:15:00 UTC
	instant := time.Date(2026, 9, 16, 0, 15, 0, 0, locKyiv)

	// In UTC:
	nowUTC := instant.In(time.UTC)
	dueCutoffUTC := time.Date(nowUTC.Year(), nowUTC.Month(), nowUTC.Day(), 23, 59, 59, 999999999, time.UTC)
	assert.Equal(t, 15, nowUTC.Day(), "UTC day should be 15th")
	assert.Equal(t, 15, dueCutoffUTC.Day(), "UTC dueCutoff day should be 15th")

	// In User Timezone (UTC+3):
	nowUser := instant.In(locKyiv)
	todayStartUser := time.Date(nowUser.Year(), nowUser.Month(), nowUser.Day(), 0, 0, 0, 0, locKyiv)
	dueCutoffUser := time.Date(nowUser.Year(), nowUser.Month(), nowUser.Day(), 23, 59, 59, 999999999, locKyiv)
	assert.Equal(t, 16, nowUser.Day(), "User timezone day should be 16th")
	assert.Equal(t, 16, dueCutoffUser.Day(), "User timezone dueCutoff day should be 16th")

	// Card scheduled for September 16
	cardDueDay := time.Date(2026, 9, 16, 0, 0, 0, 0, time.UTC)

	// Under server UTC, card scheduled for 16th is NOT due on 15th:
	assert.False(t, !cardDueDay.After(dueCutoffUTC), "Card due on 16th should NOT be due under 15th UTC cutoff")

	// Under user timezone, card scheduled for 16th IS due:
	assert.True(t, !cardDueDay.After(dueCutoffUser), "Card due on 16th MUST be due under user's 16th cutoff")
	assert.True(t, !cardDueDay.Before(todayStartUser), "Card due on 16th matches todayStart in user's timezone")
}

func TestLearningService_CacheInvalidationNilSafety(t *testing.T) {
	ls := &LearningService{
		redis: nil,
	}

	testUserID := uuid.New()
	assert.NotPanics(t, func() {
		ls.InvalidateCache(context.Background(), testUserID)
		err := ls.RefreshSession(context.Background(), testUserID)
		assert.NoError(t, err)
	})
}
