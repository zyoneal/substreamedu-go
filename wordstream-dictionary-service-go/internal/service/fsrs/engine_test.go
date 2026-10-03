package fsrs

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/substreamedu/wordstream-dictionary-service/internal/model"
)

func newTestCard(status string) *model.Dictionary {
	return &model.Dictionary{
		ID:         1,
		Status:     status,
		EaseFactor: 2.5,
		Interval:   0,
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// Learning cards
// ──────────────────────────────────────────────────────────────────────────────

func TestNewCard_Remember_AdvancesToLearningStep1(t *testing.T) {
	engine := NewEngine()
	card := newTestCard("new")

	result := engine.Review(card, Remember, 2000, nil)

	assert.True(t, result.RepeatInSession, "New card should repeat in session after first remember")
	assert.Equal(t, "learning", card.Status, "Status should remain learning during steps")
	assert.Equal(t, 1, card.LearningStep, "Should advance to learning step 1")
	assert.NotNil(t, card.LearningDue, "LearningDue should be set")
	assert.Equal(t, 1, card.CorrectReviews)
	assert.Equal(t, 1, card.TotalReviews)
}

func TestNewCard_RememberTwice_GraduatesToReview(t *testing.T) {
	engine := NewEngine()
	card := newTestCard("new")

	// Step 0 → Step 1
	engine.Review(card, Remember, 2000, nil)
	assert.Equal(t, 1, card.LearningStep)

	// Step 1 → Graduate
	result := engine.Review(card, Remember, 2000, nil)

	assert.False(t, result.RepeatInSession, "Graduated card should NOT repeat in session")
	assert.Equal(t, "review", card.Status, "Status should be 'review' after graduation")
	assert.Nil(t, card.LearningDue, "LearningDue should be nil after graduation")
	assert.Equal(t, 0, card.LearningStep, "LearningStep should be reset to 0")
	assert.NotNil(t, card.NextRepetitionDate, "NextRepetitionDate should be set")
	assert.True(t, card.NextRepetitionDate.After(time.Now().UTC()), "Next repetition should be in the future")
	assert.True(t, result.NextIntervalDays >= 1, "Interval should be at least 1 day")
}

func TestNewCard_Forgot_ResetsToStep0(t *testing.T) {
	engine := NewEngine()
	card := newTestCard("new")

	// Advance to step 1
	engine.Review(card, Remember, 2000, nil)
	assert.Equal(t, 1, card.LearningStep)

	// Forgot — reset to step 0
	result := engine.Review(card, Forgot, 2000, nil)

	assert.True(t, result.RepeatInSession, "Forgot should repeat in session")
	assert.Equal(t, "learning", card.Status)
	assert.Equal(t, 0, card.LearningStep, "Should reset to step 0")
	assert.NotNil(t, card.LearningDue, "LearningDue should be set")
	assert.Equal(t, 0, card.Lapses, "Lapses should NOT increment for never-graduated cards (RepetitionLevel=0)")
	assert.Equal(t, 0, card.ConsecutiveSuccess, "ConsecutiveSuccess should reset to 0")
}

// ──────────────────────────────────────────────────────────────────────────────
// Review cards
// ──────────────────────────────────────────────────────────────────────────────

func TestReviewCard_Remember_SchedulesFuture(t *testing.T) {
	engine := NewEngine()
	
	lastReview := time.Now().UTC().AddDate(0, 0, -5)
	card := &model.Dictionary{
		ID:              2,
		Status:          "review",
		EaseFactor:      2.5,
		Interval:        5.0, // stability = 5 days
		RepetitionLevel: 3,
		LastReviewed:    &lastReview,
	}

	result := engine.Review(card, Remember, 2000, nil)

	assert.False(t, result.RepeatInSession, "Successful review should NOT repeat in session")
	assert.Equal(t, "review", card.Status)
	assert.NotNil(t, card.NextRepetitionDate)
	assert.True(t, card.NextRepetitionDate.After(time.Now().UTC()), "Next repetition should be in the future")
	assert.Nil(t, card.LearningDue, "LearningDue should be nil for review cards")
	assert.Equal(t, 0, card.LearningStep)
	assert.True(t, result.NextIntervalDays >= 1, "Interval should be at least 1 day")
	assert.True(t, result.NewStability > 5.0, "Stability should increase after successful review")
}

func TestReviewCard_Forgot_EntersLearningSteps(t *testing.T) {
	engine := NewEngine()
	
	lastReview := time.Now().UTC().AddDate(0, 0, -10)
	card := &model.Dictionary{
		ID:              3,
		Status:          "review",
		EaseFactor:      2.0,
		Interval:        10.0,
		RepetitionLevel: 5,
		LastReviewed:    &lastReview,
	}

	result := engine.Review(card, Forgot, 2000, nil)

	assert.True(t, result.RepeatInSession, "Forgot should repeat in session")
	assert.Equal(t, "learning", card.Status, "Should enter learning state")
	assert.Equal(t, 0, card.LearningStep, "Should start at learning step 0")
	assert.NotNil(t, card.LearningDue, "LearningDue should be set for learning steps")
	assert.Equal(t, 1, card.Lapses)
	assert.Equal(t, 0, card.ConsecutiveSuccess, "ConsecutiveSuccess should reset")
	assert.True(t, result.NewStability < 10.0, "Stability should decrease after lapse")
	assert.True(t, result.NewStability >= 0.5, "Stability should not go below 0.5")
}

func TestReviewCard_Forgot_ThenRecoverThroughLearningSteps(t *testing.T) {
	engine := NewEngine()
	
	lastReview := time.Now().UTC().AddDate(0, 0, -5)
	card := &model.Dictionary{
		ID:           4,
		Status:       "review",
		EaseFactor:   2.0,
		Interval:     5.0,
		LastReviewed: &lastReview,
	}

	// Forgot — enters learning
	result1 := engine.Review(card, Forgot, 2000, nil)
	assert.Equal(t, "learning", card.Status)
	assert.Equal(t, 0, card.LearningStep)
	assert.True(t, result1.RepeatInSession)

	// Remember step 0 → step 1
	result2 := engine.Review(card, Remember, 2000, nil)
	assert.Equal(t, "learning", card.Status)
	assert.Equal(t, 1, card.LearningStep)
	assert.True(t, result2.RepeatInSession)

	// Remember step 1 → graduate back to review
	result3 := engine.Review(card, Remember, 2000, nil)
	assert.Equal(t, "review", card.Status, "Should graduate back to review")
	assert.False(t, result3.RepeatInSession)
	assert.NotNil(t, card.NextRepetitionDate)
	assert.Nil(t, card.LearningDue)
}

// ──────────────────────────────────────────────────────────────────────────────
// Leech detection
// ──────────────────────────────────────────────────────────────────────────────

func TestLeechDetection_After8Lapses(t *testing.T) {
	engine := NewEngine()
	card := newTestCard("review")
	card.Interval = 5.0
	card.Stability = 5.0
	card.RepetitionLevel = 3 // Must be graduated for lapses to count

	for i := 0; i < 8; i++ {
		lastReview := time.Now().UTC().AddDate(0, 0, -1)
		card.LastReviewed = &lastReview
		card.Status = "review"
		engine.Review(card, Forgot, 2000, nil)
	}

	assert.True(t, card.IsLeech, "Card should be marked as leech after 8 lapses")
	assert.Equal(t, 8, card.Lapses)
}

// ──────────────────────────────────────────────────────────────────────────────
// Edge cases
// ──────────────────────────────────────────────────────────────────────────────

func TestTotalReviews_IncrementedOnBothRatings(t *testing.T) {
	engine := NewEngine()
	card := newTestCard("new")

	engine.Review(card, Remember, 2000, nil)
	assert.Equal(t, 1, card.TotalReviews)

	engine.Review(card, Forgot, 2000, nil)
	assert.Equal(t, 2, card.TotalReviews)

	engine.Review(card, Remember, 2000, nil)
	assert.Equal(t, 3, card.TotalReviews)
}

func TestConsecutiveSuccess_ResetsOnForgot(t *testing.T) {
	engine := NewEngine()
	card := newTestCard("new")

	engine.Review(card, Remember, 2000, nil)
	assert.Equal(t, 1, card.ConsecutiveSuccess)

	engine.Review(card, Forgot, 2000, nil)
	assert.Equal(t, 0, card.ConsecutiveSuccess, "ConsecutiveSuccess should reset on forgot")
}

func TestFastResponse_GetsEasyGrade(t *testing.T) {
	engine := NewEngine()

	// Test with a graduated card
	lastReview := time.Now().UTC().AddDate(0, 0, -5)
	cardFast := &model.Dictionary{
		ID: 10, Status: "review", EaseFactor: 2.5, Interval: 5.0,
		LastReviewed: &lastReview,
	}
	cardSlow := &model.Dictionary{
		ID: 11, Status: "review", EaseFactor: 2.5, Interval: 5.0,
		LastReviewed: &lastReview,
	}

	resultFast := engine.Review(cardFast, Remember, 1000, nil) // Fast = EASY
	resultSlow := engine.Review(cardSlow, Remember, 9000, nil) // Slow = HARD

	assert.True(t, resultFast.NextIntervalDays >= resultSlow.NextIntervalDays,
		"Fast response should get equal or longer interval than slow response")
}

func TestStabilityField_SyncedWithInterval(t *testing.T) {
	engine := NewEngine()
	card := newTestCard("new")

	// Graduate the card
	engine.Review(card, Remember, 2000, nil)
	engine.Review(card, Remember, 2000, nil)

	assert.Equal(t, "review", card.Status)
	assert.Equal(t, card.Interval, card.Stability,
		"Stability should be synced with Interval after graduation")
	assert.True(t, card.Stability > 0, "Stability should be positive")

	// Review again
	lastReview := card.LastReviewed
	_ = lastReview
	engine.Review(card, Remember, 2000, nil)
	assert.Equal(t, card.Interval, card.Stability,
		"Stability should remain synced after review")
}

func TestRollingRetention_TracksSuccessRate(t *testing.T) {
	engine := NewEngine()
	card := newTestCard("new")

	// 1st review: remember → RollingRetention = 1.0
	engine.Review(card, Remember, 2000, nil)
	assert.InDelta(t, 1.0, float64(card.RollingRetention), 0.01)

	// 2nd review: forgot → drops toward 0
	engine.Review(card, Forgot, 2000, nil)
	assert.True(t, card.RollingRetention < 1.0,
		"RollingRetention should decrease after forgot")
	assert.True(t, card.RollingRetention > 0,
		"RollingRetention should still be positive")

	// 3rd review: remember → goes back up
	prevRetention := card.RollingRetention
	engine.Review(card, Remember, 2000, nil)
	assert.True(t, card.RollingRetention > prevRetention,
		"RollingRetention should increase after remember")
}

func TestRetrievability_CorrectForReviewCards(t *testing.T) {
	engine := NewEngine()

	// Card last reviewed 5 days ago with stability of 5
	lastReview := time.Now().UTC().AddDate(0, 0, -5)
	card := &model.Dictionary{
		ID: 20, Status: "review", EaseFactor: 2.5, Interval: 5.0,
		LastReviewed: &lastReview,
	}

	engine.Review(card, Remember, 2000, nil)

	// Retrievability should be around 0.9 (since elapsed = stability = target retention)
	// The exact value depends on the FSRS formula: R = (1 + Factor * t/S)^Decay
	assert.True(t, card.Retrievability > 0.5,
		"Retrievability should be reasonable for elapsed == stability")
	assert.True(t, card.Retrievability <= 0.99,
		"Retrievability should not exceed 0.99")
}

