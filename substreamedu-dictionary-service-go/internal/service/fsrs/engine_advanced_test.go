package fsrs

import (
	"math"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

var refTime = time.Date(2025, 6, 15, 10, 0, 0, 0, time.UTC)

func TestStabilityIncreasesMonotonicallyOnSuccessfulReviews(t *testing.T) {
	clock := NewStubClock(refTime)
	engine := NewEngine(clock)
	state := &CardState{Status: "new", EaseFactor: 2.5}

	engine.Review(state, Remember, 4000, nil)
	clock.Advance(10 * time.Minute)
	engine.Review(state, Remember, 4000, nil)
	assert.Equal(t, "review", state.Status)

	prevStability := state.Stability
	assert.True(t, prevStability > 0, "Initial stability should be positive")

	for i := 0; i < 5; i++ {
		clock.AdvanceDays(int(state.Stability))
		engine.Review(state, Remember, 4000, nil)
		assert.True(t, state.Stability > prevStability,
			"Stability should increase after successful review #%d: got %.2f <= %.2f", i+1, state.Stability, prevStability)
		prevStability = state.Stability
	}
}

func TestMaxIntervalCappedAt365Days(t *testing.T) {
	clock := NewStubClock(refTime)
	engine := NewEngine(clock)

	past := refTime.AddDate(0, 0, -100)
	state := &CardState{
		Status:	"review", EaseFactor: 2.5,
		Interval:	500, Stability: 500, RepetitionLevel: 10,
		LastReviewed:	&past,
	}

	result := engine.Review(state, Remember, 1000, nil)

	assert.LessOrEqual(t, result.NextIntervalDays, MaxIntervalDays,
		"Interval should never exceed MaxIntervalDays")
}

func TestInferGrade_Thresholds(t *testing.T) {
	engine := NewEngine(NewStubClock(refTime))

	assert.Equal(t, EASY, engine.inferGrade(1000), "< 3000ms → EASY")
	assert.Equal(t, EASY, engine.inferGrade(2999), "< 3000ms → EASY")
	assert.Equal(t, GOOD, engine.inferGrade(3000), "3000ms → GOOD")
	assert.Equal(t, GOOD, engine.inferGrade(5000), "5000ms → GOOD")
	assert.Equal(t, GOOD, engine.inferGrade(8000), "8000ms → GOOD")
	assert.Equal(t, HARD, engine.inferGrade(8001), "> 8000ms → HARD")
	assert.Equal(t, HARD, engine.inferGrade(15000), "15000ms → HARD")
}

func TestPostLapseStability_SignificantlyLower(t *testing.T) {
	clock := NewStubClock(refTime)
	engine := NewEngine(clock)

	past := refTime.AddDate(0, 0, -10)
	state := &CardState{
		Status:	"review", EaseFactor: 2.0,
		Interval:	30, Stability: 30, RepetitionLevel: 5,
		LastReviewed:	&past,
	}

	preLapseStability := state.Stability
	engine.Review(state, Forgot, 4000, nil)

	assert.True(t, state.Stability < preLapseStability*0.5,
		"Post-lapse stability should be < 50%% of pre-lapse: got %.2f vs %.2f", state.Stability, preLapseStability)
	assert.True(t, state.Stability >= 0.5, "Stability should never go below 0.5")
}

func TestPostLapseStability_MinimumFloor(t *testing.T) {
	clock := NewStubClock(refTime)
	engine := NewEngine(clock)

	past := refTime.AddDate(0, 0, -1)
	state := &CardState{
		Status:	"review", EaseFactor: 1.3,
		Interval:	0.5, Stability: 0.5, RepetitionLevel: 1,
		LastReviewed:	&past,
	}

	engine.Review(state, Forgot, 4000, nil)
	assert.True(t, state.Stability >= 0.5, "Stability floor should be 0.5")
}

func TestZombieCard_ResetToLearning(t *testing.T) {
	engine := NewEngine(NewStubClock(refTime))

	state := &CardState{
		Status:	"review", EaseFactor: 2.5,
		Interval:	0, NextRepetitionDate: nil,
	}

	result := engine.Review(state, Remember, 4000, nil)

	assert.True(t, result.RepeatInSession || state.Status == "review",
		"Zombie should enter learning path or graduate")
}

func TestDifficultyScore_BoundedZeroToOne(t *testing.T) {
	engine := NewEngine(NewStubClock(refTime))

	testCases := []struct {
		name		string
		easeFactor	float32
	}{
		{"Easy card (EF=2.5)", 2.5},
		{"Hard card (EF=1.3)", 1.3},
		{"Mid card (EF=1.8)", 1.8},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			state := &CardState{
				Status:	"new", EaseFactor: tc.easeFactor,
			}
			engine.updateDifficultyScore(state)
			assert.True(t, state.DifficultyScore >= 0 && state.DifficultyScore <= 1,
				"DifficultyScore should be in [0,1], got %.4f", state.DifficultyScore)
		})
	}
}

func TestRetrievability_HighWhenRecentlyReviewed(t *testing.T) {
	engine := NewEngine(NewStubClock(refTime))

	yesterday := refTime.AddDate(0, 0, -1)
	state := &CardState{
		Status:	"review", Interval: 30, Stability: 30,
		LastReviewed:	&yesterday,
	}

	r := engine.CalculateRetrievability(state, refTime)
	assert.True(t, r > 0.95, "Retrievability should be high when elapsed << stability, got %.4f", r)
}

func TestRetrievability_LowWhenOverdue(t *testing.T) {
	engine := NewEngine(NewStubClock(refTime))

	longAgo := refTime.AddDate(0, 0, -100)
	state := &CardState{
		Status:	"review", Interval: 5, Stability: 5,
		LastReviewed:	&longAgo,
	}

	r := engine.CalculateRetrievability(state, refTime)
	assert.True(t, r < 0.5, "Retrievability should be low when overdue, got %.4f", r)
}

func TestRetrievability_NilLastReviewed_ReturnsDefault(t *testing.T) {
	engine := NewEngine(NewStubClock(refTime))

	state := &CardState{
		Status:	"review", Interval: 5,
		LastReviewed:	nil,
	}

	r := engine.CalculateRetrievability(state, refTime)
	assert.InDelta(t, 0.9, r, 0.01, "Should return 0.9 default for nil LastReviewed")
}

func TestReviewCard_ZeroStability_NoPanic(t *testing.T) {
	clock := NewStubClock(refTime)
	engine := NewEngine(clock)

	past := refTime.AddDate(0, 0, -1)
	state := &CardState{
		Status:	"review", EaseFactor: 2.5,
		Interval:	0, Stability: 0, RepetitionLevel: 1,
		LastReviewed:		&past,
		NextRepetitionDate:	&past,
	}

	assert.NotPanics(t, func() {
		engine.Review(state, Remember, 4000, nil)
	}, "Should not panic with zero stability")

	assert.True(t, state.Stability > 0, "Stability should become positive")
}

func TestNewCard_MultipleForgets_LapsesStayZero(t *testing.T) {
	engine := NewEngine(NewStubClock(refTime))
	state := &CardState{Status: "new", EaseFactor: 2.5}

	for i := 0; i < 5; i++ {
		engine.Review(state, Forgot, 4000, nil)
	}

	assert.Equal(t, 0, state.Lapses,
		"Lapses should stay 0 for never-graduated cards (RepetitionLevel=0)")
	assert.Equal(t, 5, state.HardCount, "HardCount should still increment")
}

func TestFullLifecycle_NewToReviewToLapseToReReview(t *testing.T) {
	clock := NewStubClock(refTime)
	engine := NewEngine(clock)
	state := &CardState{Status: "new", EaseFactor: 2.5}

	r1 := engine.Review(state, Remember, 4000, nil)
	assert.Equal(t, "learning", state.Status)
	assert.True(t, r1.RepeatInSession)

	clock.Advance(10 * time.Minute)
	r2 := engine.Review(state, Remember, 4000, nil)
	assert.Equal(t, "review", state.Status)
	assert.False(t, r2.RepeatInSession)
	assert.Equal(t, 1, state.RepetitionLevel)
	graduationStability := state.Stability

	for i := 0; i < 3; i++ {
		clock.AdvanceDays(int(state.Stability))
		engine.Review(state, Remember, 4000, nil)
	}
	assert.Equal(t, "review", state.Status)
	assert.True(t, state.Stability > graduationStability)
	prelapseStab := state.Stability

	clock.AdvanceDays(int(state.Stability))
	r3 := engine.Review(state, Forgot, 4000, nil)
	assert.Equal(t, "learning", state.Status)
	assert.True(t, r3.RepeatInSession)
	assert.Equal(t, 1, state.Lapses)
	assert.True(t, state.Stability < prelapseStab)

	clock.Advance(1 * time.Minute)
	engine.Review(state, Remember, 4000, nil)
	assert.Equal(t, "learning", state.Status)
	assert.Equal(t, 1, state.LearningStep)

	clock.Advance(10 * time.Minute)
	r4 := engine.Review(state, Remember, 4000, nil)
	assert.Equal(t, "review", state.Status)
	assert.False(t, r4.RepeatInSession)
	assert.Nil(t, state.LearningDue)
}

func TestUserSpecificParams_OverrideDefaults(t *testing.T) {
	clock := NewStubClock(refTime)
	engine := NewEngine(clock)

	params := &AlgorithmParams{
		W0:	0.5, W1: 1.5, W2: 4.0, W3: 20.0,
		W4:	7.0, W5: 0.5, W6: 1.5, W7: 0.01,
		W8:	1.5, W9: 0.1, W10: 1.0, W11: 2.0, W12: 0.1,
	}

	stateDefault := &CardState{Status: "new", EaseFactor: 2.5}
	stateCustom := &CardState{Status: "new", EaseFactor: 2.5}

	engine.Review(stateDefault, Remember, 4000, nil)
	clock.Advance(10 * time.Minute)
	engine.Review(stateDefault, Remember, 4000, nil)

	clock.Set(refTime)
	engine.Review(stateCustom, Remember, 4000, params)
	clock.Advance(10 * time.Minute)
	engine.Review(stateCustom, Remember, 4000, params)

	assert.NotEqual(t, stateDefault.Stability, stateCustom.Stability,
		"Custom params should produce different stability than defaults")
}

func TestStabilityToInterval_Monotonic(t *testing.T) {
	engine := NewEngine(NewStubClock(refTime))

	prev := 0
	for s := 0.5; s <= 100; s += 0.5 {
		interval := engine.stabilityToInterval(s)
		assert.True(t, interval >= prev,
			"Interval should be monotonically increasing: S=%.1f gave %d < %d", s, interval, prev)
		prev = interval
	}
}

func TestStabilityToInterval_AtTargetRetention(t *testing.T) {
	engine := NewEngine(NewStubClock(refTime))

	interval := engine.stabilityToInterval(10.0)
	assert.True(t, math.Abs(float64(interval)-10.0) < 3,
		"At target retention, interval should be close to stability: got %d for S=10", interval)
}

func TestLeechNotTriggeredBefore8Lapses(t *testing.T) {
	clock := NewStubClock(refTime)
	engine := NewEngine(clock)
	state := &CardState{
		Status:	"review", EaseFactor: 2.0,
		Interval:	5, Stability: 5, RepetitionLevel: 3,
	}

	for i := 0; i < 7; i++ {
		past := clock.Now().AddDate(0, 0, -1)
		state.LastReviewed = &past
		state.Status = "review"
		state.Interval = 5
		engine.Review(state, Forgot, 4000, nil)
	}

	assert.False(t, state.IsLeech, "Card should NOT be leech with only 7 lapses")
	assert.Equal(t, 7, state.Lapses)
}

func TestLeechTriggeredAtExactly8Lapses(t *testing.T) {
	clock := NewStubClock(refTime)
	engine := NewEngine(clock)
	state := &CardState{
		Status:	"review", EaseFactor: 2.0,
		Interval:	5, Stability: 5, RepetitionLevel: 3,
	}

	for i := 0; i < 8; i++ {
		past := clock.Now().AddDate(0, 0, -1)
		state.LastReviewed = &past
		state.Status = "review"
		state.Interval = 5
		engine.Review(state, Forgot, 4000, nil)
	}

	assert.True(t, state.IsLeech, "Card should be leech at exactly 8 lapses")
}

func TestRollingRetention_ConvergesToZeroAfterManyForgets(t *testing.T) {
	engine := NewEngine(NewStubClock(refTime))
	state := &CardState{Status: "new", EaseFactor: 2.5}

	for i := 0; i < 20; i++ {
		engine.Review(state, Forgot, 4000, nil)
	}

	assert.True(t, state.RollingRetention < 0.15,
		"Rolling retention should converge near 0 after many forgets, got %.4f", state.RollingRetention)
}

func TestRollingRetention_ConvergesToOneAfterManyRemember(t *testing.T) {
	clock := NewStubClock(refTime)
	engine := NewEngine(clock)
	state := &CardState{Status: "new", EaseFactor: 2.5}

	engine.Review(state, Remember, 4000, nil)
	assert.InDelta(t, 1.0, float64(state.RollingRetention), 0.01)

	for i := 0; i < 20; i++ {
		engine.Review(state, Remember, 4000, nil)

		if state.Status == "review" {
			clock.AdvanceDays(int(state.Stability) + 1)
		}
	}

	assert.True(t, state.RollingRetention > 0.85,
		"Rolling retention should stay high after many remembers, got %.4f", state.RollingRetention)
}
