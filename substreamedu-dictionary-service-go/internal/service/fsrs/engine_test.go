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

	// 1. New card with Forgot enters learning and repeats in session
	result := e.Review(state, Forgot, 5000, nil)
	assert.True(t, result.RepeatInSession, "forgotten card should repeat in session")
	assert.Equal(t, "learning", state.Status)
	assert.Equal(t, 0, state.LearningStep)
	assert.NotNil(t, state.LearningDue, "LearningDue should be set for repeat")

	// 2. Intra-session recall with Remember graduates the card to review for tomorrow
	clock.Advance(10 * time.Minute)
	result = e.Review(state, Remember, 5000, nil)

	assert.False(t, result.RepeatInSession, "graduated card should not repeat in session")
	assert.Equal(t, "review", state.Status)
	assert.Equal(t, 1, result.NextIntervalDays, "initial graduation interval must be exactly 1 day")
	assert.Nil(t, state.LearningDue, "LearningDue should be nil after graduation")
}

func TestNewCard_Remember_GraduatesToNextDay(t *testing.T) {
	clock := NewStubClock(baseTime)
	e := NewEngine(clock)
	state := &CardState{Status: "new"}

	result := e.Review(state, Remember, 5000, nil)

	assert.False(t, result.RepeatInSession, "new card remembered on first try must not repeat in session")
	assert.Equal(t, "review", state.Status)
	assert.Equal(t, 1, result.NextIntervalDays, "initial interval must be 1 day (tomorrow)")
	assert.Equal(t, float32(1.0), state.Interval)
	assert.Equal(t, float32(1.0), state.Stability)
	assert.Equal(t, 1, state.RepetitionLevel)
	assert.Nil(t, state.LearningDue)

	expectedNextRep := e.startOfDayUTC(baseTime).AddDate(0, 0, 1)
	assert.NotNil(t, state.NextRepetitionDate)
	assert.Equal(t, expectedNextRep, *state.NextRepetitionDate)
}

func TestNewCard_FastAnswer_DoesNotScheduleSixteenDays(t *testing.T) {
	clock := NewStubClock(baseTime)
	e := NewEngine(clock)
	state := &CardState{Status: "new"}

	// Speed < 3000ms triggers EASY grade
	result := e.Review(state, Remember, 1200, nil)

	assert.False(t, result.RepeatInSession)
	assert.Equal(t, "review", state.Status)
	assert.LessOrEqual(t, result.NextIntervalDays, 2, "fast initial answer must NOT schedule 16 days out; max 2 days")
	assert.LessOrEqual(t, state.Interval, float32(2.0))
}

func TestEngineForgotResetsLearning(t *testing.T) {

	clock := NewStubClock(baseTime)
	e := NewEngine(clock)
	state := &CardState{Status: "new", ConsecutiveSuccess: 1}

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
