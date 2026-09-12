package fsrs

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

var baseTime = time.Date(2025, 6, 15, 10, 0, 0, 0, time.UTC)

func TestEngineLearningToReview(t *testing.T) {

	clock := NewStubClock(baseTime)
	e := NewEngine(clock)
	state := &CardState{Status: "new"}

	result := e.Review(state, Remember, 5000, nil)

	assert.True(t, result.RepeatInSession, "learning card should repeat in session")
	assert.Equal(t, "learning", state.Status)
	assert.Equal(t, 1, state.LearningStep)
	assert.NotNil(t, state.LearningDue, "LearningDue should be set for next step")

	clock.Advance(10 * time.Minute)
	result = e.Review(state, Remember, 5000, nil)

	assert.False(t, result.RepeatInSession, "graduated card should not repeat")
	assert.Equal(t, "review", state.Status)
	assert.True(t, result.NextIntervalDays >= 1, "interval should be >= 1 day")
	assert.Nil(t, state.LearningDue, "LearningDue should be nil after graduation")
}

func TestEngineForgotResetsLearning(t *testing.T) {

	clock := NewStubClock(baseTime)
	e := NewEngine(clock)
	state := &CardState{Status: "new", LearningStep: 1, ConsecutiveSuccess: 1}

	result := e.Review(state, Forgot, 5000, nil)

	assert.True(t, result.RepeatInSession)
	assert.Equal(t, 0, result.LearningStep)
	assert.Equal(t, 0, state.LearningStep)
	assert.Equal(t, "learning", state.Status)
	assert.Equal(t, 0, state.ConsecutiveSuccess, "ConsecutiveSuccess should reset on forgot")
}

func TestEngineGraduatedCardReview(t *testing.T) {

	clock := NewStubClock(baseTime)
	e := NewEngine(clock)

	sevenDaysAgo := baseTime.AddDate(0, 0, -7)
	nextRep := baseTime.AddDate(0, 0, 7)
	state := &CardState{
		Status:			"review",
		Interval:		7,
		Stability:		7,
		EaseFactor:		2.5,
		LastReviewed:		&sevenDaysAgo,
		NextRepetitionDate:	&nextRep,
		RepetitionLevel:	1,
	}

	result := e.Review(state, Remember, 5000, nil)

	assert.True(t, result.NextIntervalDays >= 1, "next interval should be >= 1 day")
	assert.Equal(t, "review", state.Status)
	assert.True(t, state.Stability > 7, "stability should increase after successful review")
}
