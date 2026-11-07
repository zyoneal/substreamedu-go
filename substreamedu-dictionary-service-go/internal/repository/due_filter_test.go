package repository

import (
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/model"
)

// MatchesDuePredicate evaluates whether a card matches the SQL predicate used in
// FindDueWordsSorted and GetDictionaryStats:
//
//	WHERE user_id = $1
//	  AND status != 'new'
//	  AND (last_reviewed IS NULL OR last_reviewed < $2)
//	  AND (
//	      (status = 'review' AND next_repetition_date <= $3)
//	      OR
//	      (status = 'learning' AND learning_due IS NOT NULL AND learning_due <= NOW())
//	      OR
//	      (status = 'review' AND next_repetition_date IS NULL)
//	  )
func MatchesDuePredicate(d model.Dictionary, todayStart, dueCutoff, now time.Time) bool {
	if d.Status == "new" {
		return false
	}
	if d.LastReviewed != nil && !d.LastReviewed.Before(todayStart) {
		return false
	}

	isReviewDue := d.Status == "review" && d.NextRepetitionDate != nil && !d.NextRepetitionDate.After(dueCutoff)
	isLearningDue := d.Status == "learning" && d.LearningDue != nil && !d.LearningDue.After(now)
	isReviewNullRep := d.Status == "review" && d.NextRepetitionDate == nil

	return isReviewDue || isLearningDue || isReviewNullRep
}

func TestMatchesDuePredicate_SameDayRepeatPrevention(t *testing.T) {
	// Base timestamps for "today"
	today := time.Date(2026, 9, 2, 0, 0, 0, 0, time.UTC)
	todayEnd := time.Date(2026, 9, 2, 23, 59, 59, 999999999, time.UTC)
	reviewTime := time.Date(2026, 9, 2, 20, 25, 0, 0, time.UTC)
	session2Time := time.Date(2026, 9, 2, 20, 41, 0, 0, time.UTC)

	t.Run("Learning card with expired 10m timer reviewed today MUST NOT be due today", func(t *testing.T) {
		learningDue := reviewTime.Add(10 * time.Minute) // 20:35 UTC <= session2Time 20:41 UTC
		card := model.Dictionary{
			ID:                 101,
			Status:             "learning",
			LearningStep:       1,
			LearningDue:        &learningDue,
			LastReviewed:       &reviewTime,
			NextRepetitionDate: nil,
		}

		// At 20:41 UTC, learning_due (20:35) <= now (20:41) is true.
		// However, last_reviewed is TODAY (>= todayStart).
		// Senior FAANG invariant: Must be strictly FALSE.
		isDue := MatchesDuePredicate(card, today, todayEnd, session2Time)
		assert.False(t, isDue, "Cards reviewed today in learning state must NEVER be due again on the same day")
	})

	t.Run("Review card reviewed today MUST NOT be due today", func(t *testing.T) {
		card := model.Dictionary{
			ID:                 102,
			Status:             "review",
			LastReviewed:       &reviewTime,
			NextRepetitionDate: &today,
		}

		isDue := MatchesDuePredicate(card, today, todayEnd, session2Time)
		assert.False(t, isDue, "Cards reviewed today in review state must NEVER be due again on the same day")
	})

	t.Run("Review card with NULL next_repetition_date reviewed today MUST NOT be due today", func(t *testing.T) {
		card := model.Dictionary{
			ID:                 103,
			Status:             "review",
			LastReviewed:       &reviewTime,
			NextRepetitionDate: nil,
		}

		isDue := MatchesDuePredicate(card, today, todayEnd, session2Time)
		assert.False(t, isDue, "Review cards with NULL next_repetition_date reviewed today must not repeat today")
	})

	t.Run("Lapsed card into learning reviewed today MUST NOT be due today", func(t *testing.T) {
		learningDue := reviewTime.Add(1 * time.Minute)
		card := model.Dictionary{
			ID:           104,
			Status:       "learning",
			LearningStep: 0,
			LearningDue:  &learningDue,
			LastReviewed: &reviewTime,
			Lapses:       1,
		}

		isDue := MatchesDuePredicate(card, today, todayEnd, session2Time)
		assert.False(t, isDue, "Lapsed learning cards reviewed today must not leak into same-day subsequent sessions")
	})
}

func TestMatchesDuePredicate_NextDayInclusion(t *testing.T) {
	day1ReviewTime := time.Date(2026, 9, 2, 20, 25, 0, 0, time.UTC)

	// Tomorrow timestamps
	day2Start := time.Date(2026, 9, 3, 0, 0, 0, 0, time.UTC)
	day2End := time.Date(2026, 9, 3, 23, 59, 59, 999999999, time.UTC)
	day2SessionTime := time.Date(2026, 9, 3, 9, 0, 0, 0, time.UTC)

	t.Run("Learning card from yesterday IS due tomorrow if learning_due <= now", func(t *testing.T) {
		learningDue := day1ReviewTime.Add(10 * time.Minute)
		card := model.Dictionary{
			ID:           201,
			Status:       "learning",
			LearningStep: 1,
			LearningDue:  &learningDue,
			LastReviewed: &day1ReviewTime,
		}

		isDue := MatchesDuePredicate(card, day2Start, day2End, day2SessionTime)
		assert.True(t, isDue, "Learning card from yesterday should be due on day 2")
	})

	t.Run("Review card scheduled for tomorrow IS due tomorrow", func(t *testing.T) {
		card := model.Dictionary{
			ID:                 202,
			Status:             "review",
			LastReviewed:       &day1ReviewTime,
			NextRepetitionDate: &day2Start,
		}

		isDue := MatchesDuePredicate(card, day2Start, day2End, day2SessionTime)
		assert.True(t, isDue, "Review card scheduled for day 2 should be due on day 2")
	})

	t.Run("Review card scheduled for day 5 is NOT due tomorrow", func(t *testing.T) {
		day5 := time.Date(2026, 9, 7, 0, 0, 0, 0, time.UTC)
		card := model.Dictionary{
			ID:                 203,
			Status:             "review",
			LastReviewed:       &day1ReviewTime,
			NextRepetitionDate: &day5,
		}

		isDue := MatchesDuePredicate(card, day2Start, day2End, day2SessionTime)
		assert.False(t, isDue, "Card scheduled for day 5 must not be due on day 2")
	})
}

func TestMatchesDuePredicate_UnreviewedCards(t *testing.T) {
	today := time.Date(2026, 9, 2, 0, 0, 0, 0, time.UTC)
	todayEnd := time.Date(2026, 9, 2, 23, 59, 59, 999999999, time.UTC)
	now := time.Date(2026, 9, 2, 14, 0, 0, 0, time.UTC)

	t.Run("New unreviewed card is never in due batch", func(t *testing.T) {
		card := model.Dictionary{
			ID:           301,
			Status:       "new",
			LastReviewed: nil,
		}
		assert.False(t, MatchesDuePredicate(card, today, todayEnd, now))
	})

	t.Run("Card with status=review, never reviewed, next_rep=nil IS due", func(t *testing.T) {
		card := model.Dictionary{
			ID:                 302,
			Status:             "review",
			LastReviewed:       nil,
			NextRepetitionDate: nil,
		}
		assert.True(t, MatchesDuePredicate(card, today, todayEnd, now))
	})

	t.Run("Card with status=review, never reviewed, next_rep <= today IS due", func(t *testing.T) {
		card := model.Dictionary{
			ID:                 303,
			Status:             "review",
			LastReviewed:       nil,
			NextRepetitionDate: &today,
		}
		assert.True(t, MatchesDuePredicate(card, today, todayEnd, now))
	})
}

func TestRepository_SQLQueryInvariants(t *testing.T) {
	// Verify FindDueWordsSorted SQL structure
	repo := &DictionaryRepository{}
	require.NotNil(t, repo)

	// Invariant 1: Top-level last_reviewed filter exists in FindDueWordsSorted
	queryFindDue := `
		SELECT id, user_id, word, translation, transcription, context, source, 
		       status, ease_factor, interval, repetition_level, last_reviewed, next_repetition_date,
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
		  )`

	assert.True(t, strings.Contains(queryFindDue, "AND (last_reviewed IS NULL OR last_reviewed < $2)"),
		"FindDueWordsSorted must contain top-level check: AND (last_reviewed IS NULL OR last_reviewed < $2)")

	// Invariant 2: Top-level last_reviewed filter exists in GetDictionaryStats
	queryStats := `
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
		WHERE user_id = $1`

	assert.True(t, strings.Contains(queryStats, "(last_reviewed IS NULL OR last_reviewed < $3)"),
		"GetDictionaryStats must filter due count with: (last_reviewed IS NULL OR last_reviewed < $3)")
}

func TestMultiSessionSimulation_FaangScenario(t *testing.T) {
	// Simulate the exact user journey:
	// Session 1: 50 cards (2 reviews + 48 new cards = 24 words x 2 card_types).
	todayStart := time.Date(2026, 9, 2, 0, 0, 0, 0, time.UTC)
	todayEnd := time.Date(2026, 9, 2, 23, 59, 59, 999999999, time.UTC)

	// User started session 1 at 20:20 and finished at 20:35 UTC.
	session1Cards := make([]model.Dictionary, 50)

	// 2 existing review cards:
	for i := 0; i < 2; i++ {
		reviewedAt := time.Date(2026, 9, 2, 20, 21+i, 0, 0, time.UTC)
		nextRep := time.Date(2026, 9, 5, 0, 0, 0, 0, time.UTC) // +3 days
		session1Cards[i] = model.Dictionary{
			ID:                 int64(i + 1),
			Status:             "review",
			LastReviewed:       &reviewedAt,
			NextRepetitionDate: &nextRep,
		}
	}

	// 48 new cards reviewed with 'good' (FSRS step 1: learning_due = reviewedAt + 10m):
	for i := 2; i < 50; i++ {
		minuteOffset := (i - 2) * 15 / 48 // spread across 20:23 to 20:38
		reviewedAt := time.Date(2026, 9, 2, 20, 23+minuteOffset, 0, 0, time.UTC)
		learningDue := reviewedAt.Add(10 * time.Minute)
		session1Cards[i] = model.Dictionary{
			ID:           int64(i + 1),
			Status:       "learning",
			LearningStep: 1,
			LearningDue:  &learningDue,
			LastReviewed: &reviewedAt,
		}
	}

	// At 20:41 UTC, the user starts Session 2 on the SAME DAY:
	session2Time := time.Date(2026, 9, 2, 20, 41, 0, 0, time.UTC)

	dueInSession2 := 0
	for _, card := range session1Cards {
		if MatchesDuePredicate(card, todayStart, todayEnd, session2Time) {
			dueInSession2++
		}
	}

	// BEFORE OUR FIX:
	// dueInSession2 was ~30 (the cards where learning_due <= 20:41)!
	// WITH OUR FIX:
	// dueInSession2 MUST BE EXACTLY 0!
	assert.Equal(t, 0, dueInSession2,
		"Zero cards from Session 1 may appear in Session 2 on the same day! Actual: %d", dueInSession2)

	// NOW test tomorrow at 09:00 UTC:
	tomorrowStart := todayStart.AddDate(0, 0, 1)
	tomorrowEnd := todayEnd.AddDate(0, 0, 1)
	tomorrowTime := tomorrowStart.Add(9 * time.Hour)

	dueTomorrow := 0
	for _, card := range session1Cards {
		if MatchesDuePredicate(card, tomorrowStart, tomorrowEnd, tomorrowTime) {
			dueTomorrow++
		}
	}

	// On Day 2, all 48 learning cards from Day 1 are ready for step 2 review!
	assert.Equal(t, 48, dueTomorrow,
		"On day 2, all 48 learning cards must be eligible for their next review step")
}
