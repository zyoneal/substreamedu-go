package fsrs

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var t0 = time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC)

func TestNewCard_FirstReview_Remember_GraduatesDirectly(t *testing.T) {

	clock := NewStubClock(t0)
	engine := NewEngine(clock)
	state := &CardState{Status: "new", EaseFactor: 2.5}

	result := engine.Review(state, Remember, 5000, nil)

	assert.Equal(t, "review", state.Status)
	assert.Equal(t, 0, state.LearningStep)
	assert.False(t, result.RepeatInSession)
	assert.Equal(t, 1, state.TotalReviews)
	assert.Equal(t, 1, state.CorrectReviews)
	assert.Equal(t, 1, result.NextIntervalDays)
	assert.Nil(t, state.LearningDue)
}

func TestNewCard_TwoRemember_GraduatesToReview(t *testing.T) {

	clock := NewStubClock(t0)
	engine := NewEngine(clock)
	state := &CardState{Status: "new", EaseFactor: 2.5}

	result := engine.Review(state, Remember, 5000, nil)

	assert.Equal(t, "review", state.Status)
	assert.False(t, result.RepeatInSession)
	assert.Equal(t, 1, state.RepetitionLevel)
	assert.Nil(t, state.LearningDue, "LearningDue cleared on graduation")
	assert.Equal(t, 0, state.LearningStep, "LearningStep cleared on graduation")
	assert.True(t, state.Stability > 0, "Stability should be set from FSRS initial stability")
	assert.Equal(t, float32(1.0), state.Retrievability, "Just-graduated card has perfect recall")
	assert.Equal(t, 1, result.NextIntervalDays, "Must schedule 1 day ahead")
	require.NotNil(t, state.NextRepetitionDate)
}

func TestNewCard_ForgotOnFirstReview_StaysInLearning(t *testing.T) {

	clock := NewStubClock(t0)
	engine := NewEngine(clock)
	state := &CardState{Status: "new", EaseFactor: 2.5}

	result := engine.Review(state, Forgot, 5000, nil)

	assert.Equal(t, "learning", state.Status)
	assert.Equal(t, 0, state.LearningStep)
	assert.True(t, result.RepeatInSession)
	assert.Equal(t, 0, state.Lapses, "No lapse — card was never graduated")
	assert.Equal(t, 1, state.HardCount)

	expectedDue := t0.Add(10 * time.Minute)
	require.NotNil(t, state.LearningDue)
	assert.Equal(t, expectedDue, *state.LearningDue)
}

func TestLearningCard_ForgotResetsToStep0(t *testing.T) {

	clock := NewStubClock(t0)
	engine := NewEngine(clock)
	state := &CardState{
		Status:			"learning",
		LearningStep:		1,
		ConsecutiveSuccess:	1,
		CorrectReviews:		1,
		TotalReviews:		1,
		EaseFactor:		2.5,
	}

	result := engine.Review(state, Forgot, 5000, nil)

	assert.Equal(t, 0, state.LearningStep)
	assert.Equal(t, 0, state.ConsecutiveSuccess)
	assert.True(t, result.RepeatInSession)
}

func TestLearningCard_RememberAtStep0_GraduatesToReview(t *testing.T) {

	clock := NewStubClock(t0)
	engine := NewEngine(clock)
	state := &CardState{
		Status:		"learning",
		LearningStep:	0,
		EaseFactor:	2.5,
	}

	result := engine.Review(state, Remember, 5000, nil)

	assert.Equal(t, 0, state.LearningStep)
	assert.False(t, result.RepeatInSession)
	assert.Equal(t, "review", state.Status)
	assert.Equal(t, 1, result.NextIntervalDays)
}

func TestReviewCard_RememberOnTime_IncreasesStability(t *testing.T) {

	clock := NewStubClock(t0)
	engine := NewEngine(clock)

	tenDaysAgo := t0.AddDate(0, 0, -10)
	state := &CardState{
		Status:			"review",
		Interval:		10,
		Stability:		10,
		EaseFactor:		2.0,
		LastReviewed:		&tenDaysAgo,
		NextRepetitionDate:	&t0,
		RepetitionLevel:	3,
	}

	stabBefore := state.Stability

	result := engine.Review(state, Remember, 5000, nil)

	assert.Equal(t, "review", state.Status)
	assert.True(t, state.Stability > stabBefore,
		"Stability should increase: before=%.2f, after=%.2f", stabBefore, state.Stability)
	assert.True(t, result.NextIntervalDays >= 1)
	assert.Equal(t, 4, state.RepetitionLevel, "RepetitionLevel should increment")
}

func TestReviewCard_Forgot_LapsesIntoLearning(t *testing.T) {

	clock := NewStubClock(t0)
	engine := NewEngine(clock)

	fiveDaysAgo := t0.AddDate(0, 0, -5)
	state := &CardState{
		Status:			"review",
		Interval:		20,
		Stability:		20,
		EaseFactor:		2.0,
		LastReviewed:		&fiveDaysAgo,
		NextRepetitionDate:	&t0,
		RepetitionLevel:	2,
	}

	result := engine.Review(state, Forgot, 5000, nil)

	assert.Equal(t, "learning", state.Status)
	assert.Equal(t, 1, state.Lapses)
	assert.Equal(t, 0, state.LearningStep)
	assert.True(t, result.RepeatInSession)
	assert.True(t, state.Stability < 20,
		"Post-lapse stability should be less than pre-lapse (20), got %.2f", state.Stability)
	assert.True(t, state.Stability >= 0.5,
		"Post-lapse stability should not go below floor (0.5), got %.2f", state.Stability)
}

func TestOverdueCard_1Day_StillHighRetrievability(t *testing.T) {

	clock := NewStubClock(t0)
	engine := NewEngine(clock)

	thirtyOneDaysAgo := t0.AddDate(0, 0, -31)
	state := &CardState{
		Status:			"review",
		Interval:		30,
		Stability:		30,
		EaseFactor:		2.0,
		LastReviewed:		&thirtyOneDaysAgo,
		RepetitionLevel:	5,
	}

	r := engine.CalculateRetrievability(state, t0)

	assert.True(t, r > 0.85 && r < 0.95,
		"1-day overdue on 30-day stability: R should be ~0.89, got %.4f", r)
}

func TestOverdueCard_30Days_ModerateRetrievability(t *testing.T) {

	clock := NewStubClock(t0)
	engine := NewEngine(clock)

	sixtyDaysAgo := t0.AddDate(0, 0, -60)
	state := &CardState{
		Status:			"review",
		Interval:		30,
		Stability:		30,
		EaseFactor:		2.0,
		LastReviewed:		&sixtyDaysAgo,
		RepetitionLevel:	5,
	}

	r := engine.CalculateRetrievability(state, t0)

	assert.True(t, r > 0.5 && r < 0.85,
		"30-day overdue on 30-day stability: R should be moderate, got %.4f", r)
}

func TestOverdueCard_365Days_VeryLowRetrievability(t *testing.T) {

	clock := NewStubClock(t0)
	engine := NewEngine(clock)

	yearAgo := t0.AddDate(-1, 0, 0)
	state := &CardState{
		Status:			"review",
		Interval:		30,
		Stability:		30,
		EaseFactor:		2.0,
		LastReviewed:		&yearAgo,
		RepetitionLevel:	5,
	}

	r := engine.CalculateRetrievability(state, t0)

	assert.True(t, r < 0.55,
		"365-day overdue on 30-day stability: R should be low, got %.4f", r)
}

func TestOverdueCard_ReviewStillProducesValidInterval(t *testing.T) {

	clock := NewStubClock(t0)
	engine := NewEngine(clock)

	yearAgo := t0.AddDate(-1, 0, 0)
	nextRepPast := t0.AddDate(0, 0, -335)
	state := &CardState{
		Status:			"review",
		Interval:		30,
		Stability:		30,
		EaseFactor:		2.0,
		LastReviewed:		&yearAgo,
		NextRepetitionDate:	&nextRepPast,
		RepetitionLevel:	3,
	}

	result := engine.Review(state, Remember, 5000, nil)

	assert.True(t, result.NextIntervalDays >= 1, "Must schedule at least 1 day")
	assert.True(t, result.NextIntervalDays <= MaxIntervalDays, "Must not exceed max interval")
	assert.Equal(t, "review", state.Status)
}

func TestEarlyReview_HighRetrievability(t *testing.T) {

	clock := NewStubClock(t0)
	engine := NewEngine(clock)

	yesterday := t0.AddDate(0, 0, -1)
	state := &CardState{
		Status:			"review",
		Interval:		30,
		Stability:		30,
		EaseFactor:		2.0,
		LastReviewed:		&yesterday,
		RepetitionLevel:	3,
	}

	r := engine.CalculateRetrievability(state, t0)

	assert.True(t, r > 0.95, "Early review should have very high R, got %.4f", r)
}

func TestEarlyReview_SmallerStabilityGain(t *testing.T) {

	clock := NewStubClock(t0)
	engine := NewEngine(clock)

	thirtyDaysAgo := t0.AddDate(0, 0, -30)
	onTime := &CardState{
		Status:	"review", Interval: 30, Stability: 30,
		EaseFactor:	2.0, LastReviewed: &thirtyDaysAgo, RepetitionLevel: 3,
	}

	fiveDaysAgo := t0.AddDate(0, 0, -5)
	early := &CardState{
		Status:	"review", Interval: 30, Stability: 30,
		EaseFactor:	2.0, LastReviewed: &fiveDaysAgo, RepetitionLevel: 3,
	}

	engine.Review(onTime, Remember, 5000, nil)

	clock.Set(t0)
	engine.Review(early, Remember, 5000, nil)

	assert.True(t, early.Stability < onTime.Stability,
		"Early review should produce smaller stability gain: early=%.2f, onTime=%.2f",
		early.Stability, onTime.Stability)
}

func TestBoundary_MinimumInterval_IsOne(t *testing.T) {
	clock := NewStubClock(t0)
	engine := NewEngine(clock)
	state := &CardState{Status: "new", EaseFactor: 2.5}

	engine.Review(state, Remember, 9000, nil)
	clock.Advance(10 * time.Minute)
	result := engine.Review(state, Remember, 9000, nil)

	assert.True(t, result.NextIntervalDays >= 1,
		"Minimum interval should be 1 day, got %d", result.NextIntervalDays)
}

func TestBoundary_EaseFactor_ClampedToRange(t *testing.T) {
	clock := NewStubClock(t0)
	engine := NewEngine(clock)

	state := &CardState{Status: "new", EaseFactor: 2.5}
	engine.Review(state, Remember, 5000, nil)
	clock.Advance(10 * time.Minute)
	engine.Review(state, Remember, 5000, nil)

	assert.True(t, state.EaseFactor >= 1.3,
		"EaseFactor should be >= 1.3, got %.2f", state.EaseFactor)
	assert.True(t, state.EaseFactor <= 2.5,
		"EaseFactor should be <= 2.5, got %.2f", state.EaseFactor)
}

func TestBoundary_StabilityFloor_IsHalf(t *testing.T) {
	clock := NewStubClock(t0)
	engine := NewEngine(clock)

	yesterday := t0.AddDate(0, 0, -1)
	state := &CardState{
		Status:	"review", EaseFactor: 1.3,
		Interval:	1, Stability: 1, RepetitionLevel: 1,
		LastReviewed:	&yesterday, NextRepetitionDate: &t0,
	}

	for i := 0; i < 10; i++ {
		state.Status = "review"
		state.Interval = state.Stability
		past := clock.Now().AddDate(0, 0, -1)
		state.LastReviewed = &past
		engine.Review(state, Forgot, 5000, nil)
	}

	assert.True(t, state.Stability >= 0.5,
		"Stability floor should be 0.5, got %.4f", state.Stability)
}

func TestClock_ReviewUsesInjectedTime(t *testing.T) {

	specificTime := time.Date(2030, 12, 25, 15, 30, 0, 0, time.UTC)
	clock := NewStubClock(specificTime)
	engine := NewEngine(clock)
	state := &CardState{Status: "new", EaseFactor: 2.5}

	engine.Review(state, Remember, 5000, nil)

	require.NotNil(t, state.LastReviewed)
	assert.Equal(t, specificTime, *state.LastReviewed,
		"LastReviewed should match the injected clock time exactly")
}

func TestClock_GraduationSchedulesFromInjectedTime(t *testing.T) {

	jan1 := time.Date(2025, 1, 1, 10, 0, 0, 0, time.UTC)
	clock := NewStubClock(jan1)
	engine := NewEngine(clock)
	state := &CardState{Status: "new", EaseFactor: 2.5}

	engine.Review(state, Remember, 5000, nil)
	clock.Advance(10 * time.Minute)
	engine.Review(state, Remember, 5000, nil)

	require.NotNil(t, state.NextRepetitionDate)
	assert.Equal(t, 2025, state.NextRepetitionDate.Year(),
		"Year should be from injected time, not system time")
	assert.True(t, state.NextRepetitionDate.After(jan1),
		"NextRepetitionDate should be after the injected time")
}

func TestClock_AdvanceDays_ProducesCorrectElapsedTime(t *testing.T) {

	clock := NewStubClock(t0)
	engine := NewEngine(clock)
	state := &CardState{Status: "new", EaseFactor: 2.5}

	engine.Review(state, Remember, 5000, nil)
	clock.Advance(10 * time.Minute)
	engine.Review(state, Remember, 5000, nil)

	clock.AdvanceDays(10)
	engine.Review(state, Remember, 5000, nil)

	assert.True(t, state.Retrievability > 0 && state.Retrievability < 1,
		"Retrievability should be computed, got %.4f", state.Retrievability)
}

func TestCounters_TotalReviews_IncreasesEveryReview(t *testing.T) {
	engine := NewEngine(NewStubClock(t0))
	state := &CardState{Status: "new", EaseFactor: 2.5}

	for i := 1; i <= 5; i++ {
		engine.Review(state, Remember, 5000, nil)
		assert.Equal(t, i, state.TotalReviews,
			"TotalReviews should be %d after %d reviews", i, i)
	}
}

func TestCounters_CorrectReviews_OnlyIncreasesOnSuccess(t *testing.T) {
	engine := NewEngine(NewStubClock(t0))
	state := &CardState{Status: "new", EaseFactor: 2.5}

	engine.Review(state, Remember, 5000, nil)
	engine.Review(state, Forgot, 5000, nil)
	engine.Review(state, Remember, 5000, nil)

	assert.Equal(t, 3, state.TotalReviews)
	assert.Equal(t, 2, state.CorrectReviews,
		"CorrectReviews should only count successes")
}

func TestCounters_ConsecutiveSuccess_ResetsOnForgot(t *testing.T) {
	engine := NewEngine(NewStubClock(t0))
	state := &CardState{Status: "new", EaseFactor: 2.5}

	engine.Review(state, Remember, 5000, nil)
	engine.Review(state, Remember, 5000, nil)
	assert.Equal(t, 2, state.ConsecutiveSuccess)

	engine.Review(state, Forgot, 5000, nil)
	assert.Equal(t, 0, state.ConsecutiveSuccess)
}
