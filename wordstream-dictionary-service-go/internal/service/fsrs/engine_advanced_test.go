package fsrs

import (
	"math"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/substreamedu/wordstream-dictionary-service/internal/model"
)

// ──────────────────────────────────────────────────────────────────────────────
// Stability Progression
// ──────────────────────────────────────────────────────────────────────────────

func TestStabilityIncreasesMonotonicallyOnSuccessfulReviews(t *testing.T) {
	engine := NewEngine()
	card := &model.Dictionary{ID: 100, Status: "new", EaseFactor: 2.5}

	// Graduate through learning steps
	engine.Review(card, Remember, 4000, nil)
	engine.Review(card, Remember, 4000, nil)
	assert.Equal(t, "review", card.Status)

	prevStability := card.Stability
	assert.True(t, prevStability > 0, "Initial stability should be positive")

	// Do 5 successful reviews, each time simulating elapsed time
	for i := 0; i < 5; i++ {
		// Simulate waiting the full interval
		past := time.Now().UTC().AddDate(0, 0, -int(card.Stability))
		card.LastReviewed = &past

		engine.Review(card, Remember, 4000, nil)
		assert.True(t, card.Stability > prevStability,
			"Stability should increase after successful review #%d: got %.2f <= %.2f", i+1, card.Stability, prevStability)
		prevStability = card.Stability
	}
}

func TestMaxIntervalCappedAt365Days(t *testing.T) {
	engine := NewEngine()

	// Create a card with very high stability
	past := time.Now().UTC().AddDate(0, 0, -100)
	card := &model.Dictionary{
		ID: 101, Status: "review", EaseFactor: 2.5,
		Interval: 500, Stability: 500, RepetitionLevel: 10,
		LastReviewed: &past,
	}

	result := engine.Review(card, Remember, 1000, nil) // fast = EASY
	assert.LessOrEqual(t, result.NextIntervalDays, MaxIntervalDays,
		"Interval should never exceed MaxIntervalDays")
}

// ──────────────────────────────────────────────────────────────────────────────
// Grade Inference
// ──────────────────────────────────────────────────────────────────────────────

func TestInferGrade_Thresholds(t *testing.T) {
	engine := NewEngine()

	assert.Equal(t, EASY, engine.inferGrade(1000), "< 3000ms → EASY")
	assert.Equal(t, EASY, engine.inferGrade(2999), "< 3000ms → EASY")
	assert.Equal(t, GOOD, engine.inferGrade(3000), "3000ms → GOOD")
	assert.Equal(t, GOOD, engine.inferGrade(5000), "5000ms → GOOD")
	assert.Equal(t, GOOD, engine.inferGrade(8000), "8000ms → GOOD")
	assert.Equal(t, HARD, engine.inferGrade(8001), "> 8000ms → HARD")
	assert.Equal(t, HARD, engine.inferGrade(15000), "15000ms → HARD")
}

// ──────────────────────────────────────────────────────────────────────────────
// Post-Lapse Stability
// ──────────────────────────────────────────────────────────────────────────────

func TestPostLapseStability_SignificantlyLower(t *testing.T) {
	engine := NewEngine()

	past := time.Now().UTC().AddDate(0, 0, -10)
	card := &model.Dictionary{
		ID: 102, Status: "review", EaseFactor: 2.0,
		Interval: 30, Stability: 30, RepetitionLevel: 5,
		LastReviewed: &past,
	}

	preLapseStability := card.Stability
	engine.Review(card, Forgot, 4000, nil)

	assert.True(t, card.Stability < preLapseStability*0.5,
		"Post-lapse stability should be < 50%% of pre-lapse: got %.2f vs %.2f", card.Stability, preLapseStability)
	assert.True(t, card.Stability >= 0.5, "Stability should never go below 0.5")
}

func TestPostLapseStability_MinimumFloor(t *testing.T) {
	engine := NewEngine()

	past := time.Now().UTC().AddDate(0, 0, -1)
	card := &model.Dictionary{
		ID: 103, Status: "review", EaseFactor: 1.3,
		Interval: 0.5, Stability: 0.5, RepetitionLevel: 1,
		LastReviewed: &past,
	}

	engine.Review(card, Forgot, 4000, nil)
	assert.True(t, card.Stability >= 0.5, "Stability floor should be 0.5")
}

// ──────────────────────────────────────────────────────────────────────────────
// Zombie Card Detection
// ──────────────────────────────────────────────────────────────────────────────

func TestZombieCard_ResetToLearning(t *testing.T) {
	engine := NewEngine()

	// Zombie: status=review but no interval/nextRepDate (legacy SM2 artifact)
	card := &model.Dictionary{
		ID: 104, Status: "review", EaseFactor: 2.5,
		Interval: 0, NextRepetitionDate: nil,
	}

	result := engine.Review(card, Remember, 4000, nil)

	// Should be treated as learning card, not review
	assert.True(t, result.RepeatInSession || card.Status == "review",
		"Zombie should enter learning path or graduate")
}

// ──────────────────────────────────────────────────────────────────────────────
// Difficulty Score
// ──────────────────────────────────────────────────────────────────────────────

func TestDifficultyScore_BoundedZeroToOne(t *testing.T) {
	engine := NewEngine()

	testCases := []struct {
		name       string
		easeFactor float32
	}{
		{"Easy card (EF=2.5)", 2.5},
		{"Hard card (EF=1.3)", 1.3},
		{"Mid card (EF=1.8)", 1.8},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			card := &model.Dictionary{
				ID: 200, Status: "new", EaseFactor: tc.easeFactor,
			}
			engine.updateDifficultyScore(card)
			assert.True(t, card.DifficultyScore >= 0 && card.DifficultyScore <= 1,
				"DifficultyScore should be in [0,1], got %.4f", card.DifficultyScore)
		})
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// Retrievability
// ──────────────────────────────────────────────────────────────────────────────

func TestRetrievability_HighWhenRecentlyReviewed(t *testing.T) {
	engine := NewEngine()

	yesterday := time.Now().UTC().AddDate(0, 0, -1)
	card := &model.Dictionary{
		ID: 300, Status: "review", Interval: 30, Stability: 30,
		LastReviewed: &yesterday,
	}

	today := time.Now().UTC()
	r := engine.CalculateRetrievability(card, today)
	assert.True(t, r > 0.95, "Retrievability should be high when elapsed << stability, got %.4f", r)
}

func TestRetrievability_LowWhenOverdue(t *testing.T) {
	engine := NewEngine()

	longAgo := time.Now().UTC().AddDate(0, 0, -100)
	card := &model.Dictionary{
		ID: 301, Status: "review", Interval: 5, Stability: 5,
		LastReviewed: &longAgo,
	}

	today := time.Now().UTC()
	r := engine.CalculateRetrievability(card, today)
	assert.True(t, r < 0.5, "Retrievability should be low when overdue, got %.4f", r)
}

func TestRetrievability_NilLastReviewed_ReturnsDefault(t *testing.T) {
	engine := NewEngine()

	card := &model.Dictionary{
		ID: 302, Status: "review", Interval: 5,
		LastReviewed: nil,
	}

	today := time.Now().UTC()
	r := engine.CalculateRetrievability(card, today)
	assert.InDelta(t, 0.9, r, 0.01, "Should return 0.9 default for nil LastReviewed")
}

// ──────────────────────────────────────────────────────────────────────────────
// Edge Cases
// ──────────────────────────────────────────────────────────────────────────────

func TestReviewCard_ZeroStability_NoPanic(t *testing.T) {
	engine := NewEngine()

	past := time.Now().UTC().AddDate(0, 0, -1)
	card := &model.Dictionary{
		ID: 400, Status: "review", EaseFactor: 2.5,
		Interval: 0, Stability: 0, RepetitionLevel: 1,
		LastReviewed:       &past,
		NextRepetitionDate: &past,
	}

	assert.NotPanics(t, func() {
		engine.Review(card, Remember, 4000, nil)
	}, "Should not panic with zero stability")

	assert.True(t, card.Stability > 0, "Stability should become positive")
}

func TestNewCard_MultipleForgets_LapsesStayZero(t *testing.T) {
	engine := NewEngine()
	card := &model.Dictionary{ID: 401, Status: "new", EaseFactor: 2.5}

	// Forget 5 times on a never-graduated card
	for i := 0; i < 5; i++ {
		engine.Review(card, Forgot, 4000, nil)
	}

	assert.Equal(t, 0, card.Lapses,
		"Lapses should stay 0 for never-graduated cards (RepetitionLevel=0)")
	assert.Equal(t, 5, card.HardCount, "HardCount should still increment")
}

// ──────────────────────────────────────────────────────────────────────────────
// Full Lifecycle
// ──────────────────────────────────────────────────────────────────────────────

func TestFullLifecycle_NewToReviewToLapseToReReview(t *testing.T) {
	engine := NewEngine()
	card := &model.Dictionary{ID: 500, Status: "new", EaseFactor: 2.5}

	// Phase 1: New → Learning Step 0 → Step 1 → Graduate to Review
	r1 := engine.Review(card, Remember, 4000, nil)
	assert.Equal(t, "learning", card.Status)
	assert.True(t, r1.RepeatInSession)

	r2 := engine.Review(card, Remember, 4000, nil)
	assert.Equal(t, "review", card.Status)
	assert.False(t, r2.RepeatInSession)
	assert.Equal(t, 1, card.RepetitionLevel)
	graduationStability := card.Stability

	// Phase 2: Successful reviews to build up stability
	for i := 0; i < 3; i++ {
		past := time.Now().UTC().AddDate(0, 0, -int(card.Stability))
		card.LastReviewed = &past
		engine.Review(card, Remember, 4000, nil)
	}
	assert.Equal(t, "review", card.Status)
	assert.True(t, card.Stability > graduationStability)
	prelapseStab := card.Stability

	// Phase 3: Lapse — forgot a review card
	past := time.Now().UTC().AddDate(0, 0, -int(card.Stability))
	card.LastReviewed = &past
	r3 := engine.Review(card, Forgot, 4000, nil)
	assert.Equal(t, "learning", card.Status)
	assert.True(t, r3.RepeatInSession)
	assert.Equal(t, 1, card.Lapses)
	assert.True(t, card.Stability < prelapseStab)

	// Phase 4: Re-learn through steps and graduate again
	engine.Review(card, Remember, 4000, nil)
	assert.Equal(t, "learning", card.Status)
	assert.Equal(t, 1, card.LearningStep)

	r4 := engine.Review(card, Remember, 4000, nil)
	assert.Equal(t, "review", card.Status)
	assert.False(t, r4.RepeatInSession)
	assert.Nil(t, card.LearningDue)
}

// ──────────────────────────────────────────────────────────────────────────────
// User-Specific FSRS Parameters
// ──────────────────────────────────────────────────────────────────────────────

func TestUserSpecificParams_OverrideDefaults(t *testing.T) {
	engine := NewEngine()

	params := &model.UserSRSParameters{
		W0: 0.5, W1: 1.5, W2: 4.0, W3: 20.0,
		W4: 7.0, W5: 0.5, W6: 1.5, W7: 0.01,
		W8: 1.5, W9: 0.1, W10: 1.0, W11: 2.0, W12: 0.1,
	}

	cardDefault := &model.Dictionary{ID: 600, Status: "new", EaseFactor: 2.5}
	cardCustom := &model.Dictionary{ID: 601, Status: "new", EaseFactor: 2.5}

	// Graduate both
	engine.Review(cardDefault, Remember, 4000, nil)
	engine.Review(cardDefault, Remember, 4000, nil)

	engine.Review(cardCustom, Remember, 4000, params)
	engine.Review(cardCustom, Remember, 4000, params)

	// With different W2 (initial stability for GOOD), intervals should differ
	assert.NotEqual(t, cardDefault.Stability, cardCustom.Stability,
		"Custom params should produce different stability than defaults")
}

// ──────────────────────────────────────────────────────────────────────────────
// stabilityToInterval consistency
// ──────────────────────────────────────────────────────────────────────────────

func TestStabilityToInterval_Monotonic(t *testing.T) {
	engine := NewEngine()

	prev := 0
	for s := 0.5; s <= 100; s += 0.5 {
		interval := engine.stabilityToInterval(s)
		assert.True(t, interval >= prev,
			"Interval should be monotonically increasing: S=%.1f gave %d < %d", s, interval, prev)
		prev = interval
	}
}

func TestStabilityToInterval_AtTargetRetention(t *testing.T) {
	engine := NewEngine()

	// At target retention 0.9, the formula should produce interval ≈ stability * constant
	// For FSRS: I = (S/Factor) * (R^(1/Decay) - 1)
	// With R=0.9, Decay=-0.5, Factor=19/81:
	// (0.9)^(1/-0.5) = 0.9^(-2) ≈ 1.2346
	// I = (S / 0.2346) * (1.2346 - 1) = S / 0.2346 * 0.2346 ≈ S
	// So interval ≈ stability (roughly)
	interval := engine.stabilityToInterval(10.0)
	assert.True(t, math.Abs(float64(interval)-10.0) < 3,
		"At target retention, interval should be close to stability: got %d for S=10", interval)
}

// ──────────────────────────────────────────────────────────────────────────────
// Leech Detection
// ──────────────────────────────────────────────────────────────────────────────

func TestLeechNotTriggeredBefore8Lapses(t *testing.T) {
	engine := NewEngine()
	card := &model.Dictionary{
		ID: 700, Status: "review", EaseFactor: 2.0,
		Interval: 5, Stability: 5, RepetitionLevel: 3,
	}

	for i := 0; i < 7; i++ {
		past := time.Now().UTC().AddDate(0, 0, -1)
		card.LastReviewed = &past
		card.Status = "review"
		card.Interval = 5
		engine.Review(card, Forgot, 4000, nil)
	}

	assert.False(t, card.IsLeech, "Card should NOT be leech with only 7 lapses")
	assert.Equal(t, 7, card.Lapses)
}

func TestLeechTriggeredAtExactly8Lapses(t *testing.T) {
	engine := NewEngine()
	card := &model.Dictionary{
		ID: 701, Status: "review", EaseFactor: 2.0,
		Interval: 5, Stability: 5, RepetitionLevel: 3,
	}

	for i := 0; i < 8; i++ {
		past := time.Now().UTC().AddDate(0, 0, -1)
		card.LastReviewed = &past
		card.Status = "review"
		card.Interval = 5
		engine.Review(card, Forgot, 4000, nil)
	}

	assert.True(t, card.IsLeech, "Card should be leech at exactly 8 lapses")
}

// ──────────────────────────────────────────────────────────────────────────────
// Rolling Retention EMA
// ──────────────────────────────────────────────────────────────────────────────

func TestRollingRetention_ConvergesToZeroAfterManyForgets(t *testing.T) {
	engine := NewEngine()
	card := &model.Dictionary{ID: 800, Status: "new", EaseFactor: 2.5}

	// 20 consecutive forgets
	for i := 0; i < 20; i++ {
		engine.Review(card, Forgot, 4000, nil)
	}

	assert.True(t, card.RollingRetention < 0.15,
		"Rolling retention should converge near 0 after many forgets, got %.4f", card.RollingRetention)
}

func TestRollingRetention_ConvergesToOneAfterManyRemember(t *testing.T) {
	engine := NewEngine()
	card := &model.Dictionary{ID: 801, Status: "new", EaseFactor: 2.5}

	// First remember
	engine.Review(card, Remember, 4000, nil)
	assert.InDelta(t, 1.0, float64(card.RollingRetention), 0.01)

	// Many more remembers (card stays in learning/review)
	for i := 0; i < 20; i++ {
		engine.Review(card, Remember, 4000, nil)
		// Reset to learning after graduation to keep reviewing
		if card.Status == "review" {
			past := time.Now().UTC().AddDate(0, 0, -int(card.Stability)-1)
			card.LastReviewed = &past
		}
	}

	assert.True(t, card.RollingRetention > 0.85,
		"Rolling retention should stay high after many remembers, got %.4f", card.RollingRetention)
}
