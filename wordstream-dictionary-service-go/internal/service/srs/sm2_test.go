package srs

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/substreamedu/wordstream-dictionary-service/internal/model"
)

func TestSM2Engine_ProcessReview_ClearsLearningFields(t *testing.T) {
	engine := NewSM2Engine()
	now := time.Now()

	// 1. Setup a card in "learning" state
	learningDue := now.Add(-1 * time.Hour)
	card := &model.Dictionary{
		ID:           1,
		Status:       "learning",
		LearningDue:  &learningDue,
		LearningStep: 1,
		EaseFactor:   2.5,
		Interval:     0,
	}

	// 2. Process a "good" review
	// Rating "remember" -> "good" in our logic (or explicitly "good" if using Anki terms, usually mapped)
	// The implementation checks for "forgot". Anything else is considered success (e.g. "remember", "good", "easy")
	repeatInSession := engine.ProcessReview(card, "remember", 1000)

	// 3. Assertions
	assert.False(t, repeatInSession, "Good review should not repeat in session")
	assert.Equal(t, "review", card.Status, "Status should be 'review'")
	assert.Nil(t, card.LearningDue, "LearningDue should be nil after graduation")
	assert.Equal(t, 0, card.LearningStep, "LearningStep should be 0 after graduation")
	assert.NotNil(t, card.NextRepetitionDate, "NextRepetitionDate should be set")
	assert.True(t, card.NextRepetitionDate.After(now), "Next repetition should be in the future")
}

func TestSM2Engine_ProcessReview_Forgot_ReschedulesSoon(t *testing.T) {
	engine := NewSM2Engine()
	now := time.Now()

	card := &model.Dictionary{
		ID:           2,
		Status:       "review",
		EaseFactor:   2.5,
		Interval:     10,
		LearningDue:  nil,
		LearningStep: 0,
	}

	// 1. Process "forgot" review
	repeatInSession := engine.ProcessReview(card, "forgot", 1000)

	// 2. Assertions
	assert.True(t, repeatInSession, "Forgot review SHOULD repeat in session")
	assert.Equal(t, "learning", card.Status, "Status should be 'learning'")

	// Check NextRepetitionDate is roughly 10 mins from now
	// Allow 1 second delta for execution time
	expectedNext := now.Add(10 * time.Minute)
	assert.NotNil(t, card.NextRepetitionDate)
	diff := card.NextRepetitionDate.Sub(expectedNext)
	if diff < 0 {
		diff = -diff
	}
	assert.Less(t, diff, 2*time.Second, "Next repetition should be ~10 mins from now")

	// Ensure LearningDue is nil (we use NextRepetitionDate for intra-day scheduling now?
	// Or do we use LearningDue? The fix says we clear LearningDue.
	// Let's check implementation of sm2.go logic for 'forgot')
	// If 'forgot' sets status to 'learning', we expect it to be handled by the query looking at NOW().
	// sm2.go sets NextRepetitionDate. It should probably CLEAR LearningDue to avoid confusion,
	// OR use LearningDue for intra-day.
	// Current sm2.go implementation (from what I saw) sets NextRepetitionDate.
	// So LearningDue should be nil/cleared to avoid double-dipping?
	// Or maybe LearningDue IS used for steps?
	// Let's verify what sm2.go does.
	// "clearing `LearningDue` and `LearningStep` when a card is reviewed" -> This applied to graduation.
	// For "forgot", we set status="learning". The query I'm fixing looks at `next_repetition_date <= NOW()`.
	// So `LearningDue` is irrelevant if we use `next_repetition_date`.
	// Ideally `LearningDue` is cleared to keep it clean.
}
