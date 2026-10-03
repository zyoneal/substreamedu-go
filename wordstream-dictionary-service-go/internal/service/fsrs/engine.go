package fsrs

import (
	"math"
	"time"

	"github.com/substreamedu/wordstream-dictionary-service/internal/model"
)

// ──────────────────────────────────────────────────────────────────────────────
// FSRS-4.5 Constants (Open-source defaults from https://github.com/open-spaced-repetition/fsrs4anki)
// ──────────────────────────────────────────────────────────────────────────────

const (
	W0  = 0.40255
	W1  = 1.18385
	W2  = 3.173
	W3  = 15.69105
	W4  = 7.1949
	W5  = 0.5345
	W6  = 1.4604
	W7  = 0.0046
	W8  = 1.54575
	W9  = 0.1192
	W10 = 1.01925
	W11 = 1.9395
	W12 = 0.11
	W13 = 0.29605
	W14 = 2.2698

	Decay  = -0.5
	Factor = 19.0 / 81.0

	FastThresholdMs = 3000
	SlowThresholdMs = 8000

	TargetRetention = 0.90
	MaxIntervalDays = 365
)

// LearningStepsMinutes defines the graduated learning steps.
// Step 0 = show again after 1 min, Step 1 = 10 min, Step 2 = graduate to review.
// On "forgot" the card resets to step 0.
var LearningStepsMinutes = []int{1, 10}

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type UserRating string

const (
	Forgot   UserRating = "forgot"
	Remember UserRating = "remember"
)

type InternalGrade int

const (
	AGAIN InternalGrade = 1
	HARD  InternalGrade = 2
	GOOD  InternalGrade = 3
	EASY  InternalGrade = 4
)

// ReviewResult is returned from every review call so the service layer can
// decide what to persist and what to send back to the client.
type ReviewResult struct {
	NextIntervalDays int
	RepeatInSession  bool
	NewStability     float32
	LearningDue      *time.Time
	LearningStep     int
}

// Engine is a stateless FSRS-4.5 implementation.
type Engine struct{}

func NewEngine() *Engine { return &Engine{} }

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

// Review is the single entry-point for reviewing a card.
// It detects whether the card is in a learning state or review state and
// dispatches accordingly.
func (e *Engine) Review(card *model.Dictionary, rating UserRating, responseTimeMs int, params *model.UserSRSParameters) ReviewResult {
	now := time.Now().UTC()

	// Capture previous last_reviewed BEFORE we overwrite it,
	// so retrievability calculation uses the correct elapsed time.
	prevLastReviewed := card.LastReviewed

	// Always bump total reviews & set last_reviewed
	card.TotalReviews++
	card.LastReviewed = &now

	// Update rolling retention (exponential moving average, ~10 review window)
	successVal := float32(0.0)
	if rating != Forgot {
		successVal = 1.0
	}
	if card.TotalReviews == 1 {
		card.RollingRetention = successVal
	} else {
		card.RollingRetention = card.RollingRetention*0.9 + successVal*0.1
	}

	// Zombie card detection: status='review' but missing FSRS data.
	// This can happen if cards were processed by legacy SM2 code before the FSRS migration.
	// A properly graduated card always has Interval > 0 and NextRepetitionDate set.
	// Reset zombies to learning so they get properly graduated with FSRS parameters.
	if card.Status == "review" && card.Interval == 0 && card.NextRepetitionDate == nil {
		card.Status = "learning"
		card.LearningStep = 0
	}

	if e.isLearningCard(card) {
		return e.reviewLearningCard(card, rating, responseTimeMs, params, now)
	}
	return e.reviewReviewCard(card, rating, responseTimeMs, params, now, prevLastReviewed)
}

// ──────────────────────────────────────────────────────────────────────────────
// Learning-state cards (status = "new" | "learning")
// ──────────────────────────────────────────────────────────────────────────────

func (e *Engine) reviewLearningCard(card *model.Dictionary, rating UserRating, responseTimeMs int, params *model.UserSRSParameters, now time.Time) ReviewResult {
	if rating == Forgot {
		return e.learningForgot(card, now)
	}
	return e.learningRemember(card, responseTimeMs, params, now)
}

// learningForgot resets the card to learning step 0.
func (e *Engine) learningForgot(card *model.Dictionary, now time.Time) ReviewResult {
	card.LearningStep = 0
	card.Status = "learning"
	// Only count as a lapse if the card was previously graduated.
	// A card that has never left learning is not "lapsing" — it's failing to learn.
	if card.RepetitionLevel > 0 {
		card.Lapses++
	}
	card.HardCount++
	card.ConsecutiveSuccess = 0

	// Schedule for the first learning step (1 min from now)
	due := now.Add(time.Duration(LearningStepsMinutes[0]) * time.Minute)
	card.LearningDue = &due
	// Don't touch NextRepetitionDate — it stays at whatever the last review set.
	// The query will look at LearningDue for learning cards.

	e.updateLeechDetection(card)
	e.updateDifficultyScore(card)

	// Sync the dedicated Stability field
	card.Stability = card.Interval

	return ReviewResult{
		NextIntervalDays: 0,
		RepeatInSession:  true,
		NewStability:     card.Interval,
		LearningDue:      &due,
		LearningStep:     0,
	}
}

// learningRemember advances to the next learning step, or graduates to review.
func (e *Engine) learningRemember(card *model.Dictionary, responseTimeMs int, params *model.UserSRSParameters, now time.Time) ReviewResult {
	card.ConsecutiveSuccess++
	card.CorrectReviews++

	nextStep := card.LearningStep + 1

	// If we've completed all learning steps → graduate to review
	if nextStep >= len(LearningStepsMinutes) {
		return e.graduateToReview(card, responseTimeMs, params, now)
	}

	// Otherwise, schedule the next learning step
	card.LearningStep = nextStep
	card.Status = "learning"
	due := now.Add(time.Duration(LearningStepsMinutes[nextStep]) * time.Minute)
	card.LearningDue = &due

	return ReviewResult{
		NextIntervalDays: 0,
		RepeatInSession:  true,
		NewStability:     card.Interval,
		LearningDue:      &due,
		LearningStep:     nextStep,
	}
}

// graduateToReview transitions a learning/new card to "review" state with
// an initial stability computed from the FSRS-4.5 initial stability formula.
func (e *Engine) graduateToReview(card *model.Dictionary, responseTimeMs int, params *model.UserSRSParameters, now time.Time) ReviewResult {
	card.LearningStep = 0
	card.LearningDue = nil
	card.Status = "review"
	card.HardCount = 0

	grade := e.inferGrade(responseTimeMs)

	w0, w1, w2, w3 := W0, W1, W2, W3
	if params != nil {
		w0 = float64(params.W0)
		w1 = float64(params.W1)
		w2 = float64(params.W2)
		w3 = float64(params.W3)
	}

	var initialStability float64
	switch grade {
	case AGAIN:
		initialStability = w0
	case HARD:
		initialStability = w1
	case GOOD:
		initialStability = w2
	case EASY:
		initialStability = w3
	}

	interval := e.stabilityToInterval(initialStability)
	if interval < 1 {
		interval = 1
	}
	if interval > MaxIntervalDays {
		interval = MaxIntervalDays
	}

	today := e.startOfDayUTC(now)
	nextRep := today.AddDate(0, 0, interval)
	card.Interval = float32(initialStability)
	card.Stability = float32(initialStability)
	card.Retrievability = 1.0 // just graduated = perfect recall
	card.NextRepetitionDate = &nextRep
	card.RepetitionLevel++

	// Initial difficulty from FSRS
	d := e.initialDifficulty(grade, params)
	card.EaseFactor = float32(math.Max(1.3, math.Min(2.5, (11-d)/4)))
	e.updateDifficultyScore(card)

	return ReviewResult{
		NextIntervalDays: interval,
		RepeatInSession:  false,
		NewStability:     float32(initialStability),
		LearningDue:      nil,
		LearningStep:     -1, // sentinel: graduated
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// Review-state cards (status = "review")
// ──────────────────────────────────────────────────────────────────────────────

func (e *Engine) reviewReviewCard(card *model.Dictionary, rating UserRating, responseTimeMs int, params *model.UserSRSParameters, now time.Time, prevLastReviewed *time.Time) ReviewResult {
	if rating == Forgot {
		return e.reviewForgot(card, now, params, prevLastReviewed)
	}
	return e.reviewRemember(card, responseTimeMs, params, now, prevLastReviewed)
}

// reviewForgot lapses a review card back into learning.
// Uses the full FSRS-4.5 post-lapse stability formula:
//
//	S_new = w11 * D^(-w12) * ((S+1)^w13 - 1) * e^(w14*(1-R))
func (e *Engine) reviewForgot(card *model.Dictionary, now time.Time, params *model.UserSRSParameters, prevLastReviewed *time.Time) ReviewResult {
	card.Lapses++
	card.HardCount++
	card.ConsecutiveSuccess = 0
	card.Status = "learning"
	card.LearningStep = 0

	// Post-lapse stability using full FSRS-4.5 formula
	currentStability := float64(card.Interval)
	if currentStability < 1 {
		currentStability = 1
	}
	d := math.Max(1, math.Min(10, float64(11-card.EaseFactor*4)))

	w11 := float64(W11)
	w12 := float64(W12)
	w13 := float64(W13)
	w14 := float64(W14)
	if params != nil {
		w11 = float64(params.W11)
		w12 = float64(params.W12)
		w13 = float64(params.W13)
		w14 = float64(params.W14)
	}

	// Calculate retrievability at the moment of lapse
	today := e.startOfDayUTC(now)
	r := e.calculateRetrievabilityFromTime(prevLastReviewed, currentStability, today)

	newStability := w11 * math.Pow(d, -w12) * (math.Pow(currentStability+1, w13) - 1) * math.Exp(w14*(1-r))
	newStability = math.Max(0.5, newStability)

	card.Interval = float32(newStability)
	card.Stability = float32(newStability)

	// Schedule first learning step
	due := now.Add(time.Duration(LearningStepsMinutes[0]) * time.Minute)
	card.LearningDue = &due

	e.updateLeechDetection(card)
	e.updateDifficultyScore(card)

	return ReviewResult{
		NextIntervalDays: 0,
		RepeatInSession:  true,
		NewStability:     float32(newStability),
		LearningDue:      &due,
		LearningStep:     0,
	}
}

// reviewRemember processes a successful recall of a review card.
func (e *Engine) reviewRemember(card *model.Dictionary, responseTimeMs int, params *model.UserSRSParameters, now time.Time, prevLastReviewed *time.Time) ReviewResult {
	today := e.startOfDayUTC(now)

	stability := float64(card.Interval)
	if stability < 0.5 {
		stability = 0.5
	}
	difficulty := card.EaseFactor
	d := math.Max(1, math.Min(10, float64(11-difficulty*4)))

	// Use the PREVIOUS last_reviewed for retrievability calculation,
	// because Review() already set LastReviewed = now before calling us.
	r := e.calculateRetrievabilityFromTime(prevLastReviewed, stability, today)
	card.Retrievability = float32(r)

	grade := e.inferGrade(responseTimeMs)
	newStability := e.calculateNewStability(stability, d, r, grade, params)
	newDifficulty := e.updateDifficulty(d, grade, params)
	newEaseFactor := float32(math.Max(1.3, math.Min(2.5, (11-newDifficulty)/4)))

	interval := e.stabilityToInterval(newStability)
	if interval < 1 {
		interval = 1
	}
	if interval > MaxIntervalDays {
		interval = MaxIntervalDays
	}

	nextRep := today.AddDate(0, 0, interval)
	card.Interval = float32(newStability)
	card.Stability = float32(newStability)
	card.EaseFactor = newEaseFactor
	card.NextRepetitionDate = &nextRep
	card.LearningDue = nil
	card.LearningStep = 0
	card.RepetitionLevel++
	card.ConsecutiveSuccess++
	card.CorrectReviews++
	card.HardCount = 0

	card.Status = "review"
	e.updateDifficultyScore(card)

	return ReviewResult{
		NextIntervalDays: interval,
		RepeatInSession:  false,
		NewStability:     float32(newStability),
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// FSRS-4.5 Math
// ──────────────────────────────────────────────────────────────────────────────

func (e *Engine) inferGrade(responseTimeMs int) InternalGrade {
	if responseTimeMs < FastThresholdMs {
		return EASY
	}
	if responseTimeMs > SlowThresholdMs {
		return HARD
	}
	return GOOD
}

// CalculateRetrievability computes R(t) using the FSRS power-decay formula.
// Public method for external callers (stats, etc.).
func (e *Engine) CalculateRetrievability(card *model.Dictionary, today time.Time) float64 {
	return e.calculateRetrievabilityFromTime(card.LastReviewed, float64(card.Interval), today)
}

// calculateRetrievabilityFromTime is the internal implementation that accepts
// an explicit lastReviewed time. This avoids bugs where Review() has already
// overwritten card.LastReviewed = now before we compute R.
func (e *Engine) calculateRetrievabilityFromTime(lastReviewed *time.Time, stability float64, today time.Time) float64 {
	if lastReviewed == nil {
		return 0.9
	}
	daysSinceReview := today.Sub(*lastReviewed).Hours() / 24
	if daysSinceReview <= 0 {
		return 0.99
	}

	if stability < 1 {
		stability = 1
	}
	r := math.Pow(1+Factor*daysSinceReview/stability, Decay)
	return math.Max(0.01, math.Min(0.99, r))
}

func (e *Engine) calculateNewStability(s, d, r float64, grade InternalGrade, params *model.UserSRSParameters) float64 {
	w8 := float64(W8)
	w9 := float64(W9)
	w10 := float64(W10)
	w11 := float64(W11)
	w12 := float64(W12)

	if params != nil {
		w8 = float64(params.W8)
		w9 = float64(params.W9)
		w10 = float64(params.W10)
		w11 = float64(params.W11)
		w12 = float64(params.W12)
	}

	easyBonus := 1.0
	if grade == EASY {
		easyBonus = 1 + w12
	}
	if grade == HARD {
		easyBonus = 1.0 / w11 // penalty
	}

	stabilityIncrease := math.Exp(w8) * (11 - d) * math.Pow(s, -w9) * (math.Exp(w10*(1-r)) - 1) * easyBonus
	res := s * (stabilityIncrease + 1)
	if res > float64(MaxIntervalDays)*2 {
		res = float64(MaxIntervalDays) * 2
	}
	return math.Max(1, res)
}

func (e *Engine) updateDifficulty(d float64, grade InternalGrade, params *model.UserSRSParameters) float64 {
	w4 := float64(W4)
	w5 := float64(W5)
	w6 := float64(W6)
	w7 := float64(W7)

	if params != nil {
		w4 = float64(params.W4)
		w5 = float64(params.W5)
		w6 = float64(params.W6)
		w7 = float64(params.W7)
	}

	delta := -w6 * float64(int(grade)-3)
	dPrime := d + delta*(10-d)/9
	meanD := w4 - math.Exp(w5*(4-1)) + 1
	dFinal := w7*meanD + (1-w7)*dPrime
	return math.Max(1, math.Min(10, dFinal))
}

func (e *Engine) initialDifficulty(grade InternalGrade, params *model.UserSRSParameters) float64 {
	w4 := float64(W4)
	w5 := float64(W5)
	if params != nil {
		w4 = float64(params.W4)
		w5 = float64(params.W5)
	}
	d0 := w4 - math.Exp(w5*float64(int(grade)-1)) + 1
	return math.Max(1, math.Min(10, d0))
}

func (e *Engine) stabilityToInterval(stability float64) int {
	interval := (stability / Factor) * (math.Pow(TargetRetention, 1.0/Decay) - 1)
	return int(math.Round(interval))
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

func (e *Engine) isLearningCard(card *model.Dictionary) bool {
	return card.Status == "new" || card.Status == "learning"
}

func (e *Engine) startOfDayUTC(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

func (e *Engine) updateDifficultyScore(card *model.Dictionary) {
	// Raw FSRS difficulty (1-10) normalized to [0, 1].
	// D = max(1, min(10, 11 - EaseFactor*4))
	d := math.Max(1, math.Min(10, float64(11-card.EaseFactor*4)))
	card.DifficultyScore = float32((d - 1) / 9) // 0 = easiest, 1 = hardest
}

func (e *Engine) updateLeechDetection(card *model.Dictionary) {
	if card.Lapses >= 8 {
		card.IsLeech = true
	}
}
