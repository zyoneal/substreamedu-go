package service

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
)

func TestStreakTimezone_WeekDaysCalculation(t *testing.T) {
	loc, err := time.LoadLocation("Europe/Moscow")
	assert.NoError(t, err)

	now := time.Now().In(loc)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)

	weekday := int(now.Weekday())
	daysSinceMonday := (weekday + 6) % 7
	mondayDate := today.AddDate(0, 0, -daysSinceMonday)

	// Simulate reviews on Monday and Wednesday of current week
	reviewedDates := []time.Time{
		mondayDate,
		mondayDate.AddDate(0, 0, 2),
	}

	reviewedMap := make(map[string]bool)
	for _, d := range reviewedDates {
		reviewedMap[d.Format("2006-01-02")] = true
	}

	weekDays := make([]bool, 7)
	for i := 0; i < 7; i++ {
		curDay := mondayDate.AddDate(0, 0, i)
		if reviewedMap[curDay.Format("2006-01-02")] {
			weekDays[i] = true
		}
	}

	assert.True(t, weekDays[0], "Monday should be marked true")
	assert.False(t, weekDays[1], "Tuesday should be false")
	assert.True(t, weekDays[2], "Wednesday should be marked true")
	assert.False(t, weekDays[3], "Thursday should be false")
	assert.False(t, weekDays[4], "Friday should be false")
	assert.False(t, weekDays[5], "Saturday should be false")
	assert.False(t, weekDays[6], "Sunday should be false")
}

func TestSRSStats_WeekDaysSerialization(t *testing.T) {
	stats := &dto.DictionaryStatsDto{
		TotalWords:    500,
		StreakDays:    3,
		ReviewedToday: false,
		WeekDays:      []bool{false, false, false, false, false, false, false},
	}

	data, err := json.Marshal(stats)
	assert.NoError(t, err)

	var restored dto.DictionaryStatsDto
	err = json.Unmarshal(data, &restored)
	assert.NoError(t, err)
	assert.Equal(t, 7, len(restored.WeekDays))
	assert.False(t, restored.ReviewedToday)
	assert.False(t, restored.WeekDays[0])
}
