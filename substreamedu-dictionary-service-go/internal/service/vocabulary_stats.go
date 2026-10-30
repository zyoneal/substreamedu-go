package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
)

func (s *VocabularyService) GetDictionaryStats(ctx context.Context, userID uuid.UUID, loc *time.Location) (*dto.DictionaryStatsDto, error) {
	if loc == nil {
		loc = time.UTC
	}
	cacheKey := fmt.Sprintf("srs:stats:%s:%s", userID.String(), loc.String())
	if s.redis != nil {
		val, err := s.redis.Get(ctx, cacheKey).Bytes()
		if err == nil && len(val) > 0 {
			var cachedStats dto.DictionaryStatsDto
			if err := json.Unmarshal(val, &cachedStats); err == nil {
				return &cachedStats, nil
			}
		}
	}

	now := time.Now().In(loc)
	dueCutoff := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999999999, loc)

	stats, err := s.repo.GetDictionaryStats(ctx, userID, dueCutoff)
	if err != nil {
		return nil, err
	}

	streak, reviewedToday, weekDays := s.CalculateStreakInfo(ctx, userID, loc)
	stats.StreakDays = streak
	stats.ReviewedToday = reviewedToday
	stats.WeekDays = weekDays

	if s.redis != nil {
		if data, err := json.Marshal(stats); err == nil {
			s.redis.Set(ctx, cacheKey, data, 2*time.Minute)
		}
	}

	return stats, nil
}

func (s *VocabularyService) InvalidateSRSStatsCache(ctx context.Context, userID uuid.UUID) {
	if s.redis != nil {
		iter := s.redis.Scan(ctx, 0, fmt.Sprintf("srs:stats:%s*", userID.String()), 0).Iterator()
		for iter.Next(ctx) {
			s.redis.Del(ctx, iter.Val())
		}
		s.redis.Del(ctx, "srs:stats:"+userID.String())
	}
}

func (s *VocabularyService) GetTopUsersByWordCount(ctx context.Context, limit int) ([]dto.TopUserDto, error) {
	return s.repo.GetTopUsersByWordCount(ctx, limit)
}

func (s *VocabularyService) CalculateStreak(ctx context.Context, userID uuid.UUID, loc *time.Location) int {
	streak, _, _ := s.CalculateStreakInfo(ctx, userID, loc)
	return streak
}

func (s *VocabularyService) CalculateStreakInfo(ctx context.Context, userID uuid.UUID, loc *time.Location) (int, bool, []bool) {
	if loc == nil {
		loc = time.UTC
	}
	now := time.Now().In(loc)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)

	// WeekDays: 7 booleans for Monday..Sunday of the current week in loc
	weekday := int(now.Weekday())        // Sunday = 0, Monday = 1, ..., Saturday = 6
	daysSinceMonday := (weekday + 6) % 7 // Monday = 0, Tuesday = 1, ..., Sunday = 6
	mondayDate := today.AddDate(0, 0, -daysSinceMonday)
	weekDays := make([]bool, 7)

	dates, err := s.repo.GetUserReviewDates(ctx, userID, loc.String())
	if err != nil || len(dates) == 0 {
		return 0, false, weekDays
	}

	reviewedMap := make(map[string]bool, len(dates))
	for _, d := range dates {
		reviewedMap[d.Format("2006-01-02")] = true
	}

	for i := 0; i < 7; i++ {
		curDay := mondayDate.AddDate(0, 0, i)
		if reviewedMap[curDay.Format("2006-01-02")] {
			weekDays[i] = true
		}
	}

	yesterday := today.AddDate(0, 0, -1)

	latest := dates[0]
	latestYear, latestMonth, latestDay := latest.Date()
	todayYear, todayMonth, todayDay := today.Date()
	yesterdayYear, yesterdayMonth, yesterdayDay := yesterday.Date()

	isToday := latestYear == todayYear && latestMonth == todayMonth && latestDay == todayDay
	isYesterday := latestYear == yesterdayYear && latestMonth == yesterdayMonth && latestDay == yesterdayDay

	if !isToday && !isYesterday {
		return 0, false, weekDays
	}

	streak := 0
	currentExpected := latest

	for _, date := range dates {
		dy, dm, dd := date.Date()
		ey, em, ed := currentExpected.Date()

		if dy == ey && dm == em && dd == ed {
			streak++
			currentExpected = currentExpected.AddDate(0, 0, -1)
		} else {
			break
		}
	}

	return streak, isToday, weekDays
}
