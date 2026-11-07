package srs

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/model"
)

func TestSM2Engine_ProcessReview_ClearsLearningFields(t *testing.T) {
	engine := NewSM2Engine()
	now := time.Now()

	learningDue := now.Add(-1 * time.Hour)
	card := &model.Dictionary{
		ID:		1,
		Status:		"learning",
		LearningDue:	&learningDue,
		LearningStep:	1,
		EaseFactor:	2.5,
		Interval:	0,
	}

	repeatInSession := engine.ProcessReview(card, "remember", 1000)

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
		ID:		2,
		Status:		"review",
		EaseFactor:	2.5,
		Interval:	10,
		LearningDue:	nil,
		LearningStep:	0,
	}

	repeatInSession := engine.ProcessReview(card, "forgot", 1000)

	assert.True(t, repeatInSession, "Forgot review SHOULD repeat in session")
	assert.Equal(t, "learning", card.Status, "Status should be 'learning'")

	expectedNext := now.Add(10 * time.Minute)
	assert.NotNil(t, card.NextRepetitionDate)
	diff := card.NextRepetitionDate.Sub(expectedNext)
	if diff < 0 {
		diff = -diff
	}
	assert.Less(t, diff, 2*time.Second, "Next repetition should be ~10 mins from now")

}
