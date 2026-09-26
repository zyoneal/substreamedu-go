package fsrs

import (
	"math"
	"time"
)

const (
	W0	= 0.40255
	W1	= 1.18385
	W2	= 3.173
	W3	= 15.69105
	W4	= 7.1949
	W5	= 0.5345
	W6	= 1.4604
	W7	= 0.0046
	W8	= 1.54575
	W9	= 0.1192
	W10	= 1.01925
	W11	= 1.9395
	W12	= 0.11
	W13	= 0.29605
	W14	= 2.2698

	Decay	= -0.5
	Factor	= 19.0 / 81.0

	FastThresholdMs	= 3000
	SlowThresholdMs	= 8000

	TargetRetention	= 0.90
	MaxIntervalDays	= 365
)

var LearningStepsMinutes = []int{10}

type UserRating string

const (
	Forgot		UserRating	= "forgot"
	Remember	UserRating	= "remember"
)

type InternalGrade int

const (
	AGAIN	InternalGrade	= 1
	HARD	InternalGrade	= 2
	GOOD	InternalGrade	= 3
	EASY	InternalGrade	= 4
)

type ReviewResult struct {
	NextIntervalDays	int
	RepeatInSession		bool
	NewStability		float32
	LearningDue		*time.Time
	LearningStep		int
}

type Engine struct {
	clock Clock
}

func NewEngine(clock Clock) *Engine {
	return &Engine{clock: clock}
}

func (e *Engine) Review(state *CardState, rating UserRating, responseTimeMs int, params *AlgorithmParams) ReviewResult {
	now := e.clock.Now()

	prevLastReviewed := state.LastReviewed

	state.TotalReviews++
	state.LastReviewed = &now

	successVal := float32(0.0)
	if rating != Forgot {
		successVal = 1.0
	}
	if state.TotalReviews == 1 {
		state.RollingRetention = successVal
	} else {
		state.RollingRetention = state.RollingRetention*0.9 + successVal*0.1
	}

	if state.Status == "review" && state.Interval == 0 && state.NextRepetitionDate == nil {
		state.Status = "learning"
		state.LearningStep = 0
	}

	if e.isLearningCard(state) {
		return e.reviewLearningCard(state, rating, responseTimeMs, params, now)
	}
	return e.reviewReviewCard(state, rating, responseTimeMs, params, now, prevLastReviewed)
}

func (e *Engine) reviewLearningCard(state *CardState, rating UserRating, responseTimeMs int, params *AlgorithmParams, now time.Time) ReviewResult {
	if rating == Forgot {
		return e.learningForgot(state, now)
	}
	return e.learningRemember(state, responseTimeMs, params, now)
}

func (e *Engine) learningForgot(state *CardState, now time.Time) ReviewResult {
	state.LearningStep = 0
	state.Status = "learning"

	if state.RepetitionLevel > 0 {
		state.Lapses++
	}
	state.HardCount++
	state.ConsecutiveSuccess = 0

	due := now.Add(time.Duration(LearningStepsMinutes[0]) * time.Minute)
	state.LearningDue = &due

	e.updateLeechDetection(state)
	e.updateDifficultyScore(state)

	state.Stability = state.Interval

	return ReviewResult{
		NextIntervalDays:	0,
		RepeatInSession:	true,
		NewStability:		state.Interval,
		LearningDue:		&due,
		LearningStep:		0,
	}
}

func (e *Engine) learningRemember(state *CardState, responseTimeMs int, params *AlgorithmParams, now time.Time) ReviewResult {
	state.ConsecutiveSuccess++
	state.CorrectReviews++

	nextStep := state.LearningStep + 1

	if state.Status == "new" || nextStep >= len(LearningStepsMinutes) {
		return e.graduateToReview(state, responseTimeMs, params, now)
	}

	state.LearningStep = nextStep
	state.Status = "learning"
	due := now.Add(time.Duration(LearningStepsMinutes[nextStep]) * time.Minute)
	state.LearningDue = &due

	return ReviewResult{
		NextIntervalDays:	0,
		RepeatInSession:	true,
		NewStability:		state.Interval,
		LearningDue:		&due,
		LearningStep:		nextStep,
	}
}

func (e *Engine) graduateToReview(state *CardState, responseTimeMs int, params *AlgorithmParams, now time.Time) ReviewResult {
	state.LearningStep = 0
	state.LearningDue = nil
	state.Status = "review"
	state.HardCount = 0

	grade := e.inferGrade(responseTimeMs)

	var initialStability float64
	var interval int

	if state.RepetitionLevel == 0 {
		// Senior FAANG Invariant: First graduation of a newly learned card
		// MUST be scheduled for tomorrow (1 day) for GOOD and HARD.
		// Fast answer heuristic (< 3000ms, EASY) is capped at 2 days (never 16 days W3).
		switch grade {
		case AGAIN, HARD, GOOD:
			initialStability = 1.0
			interval = 1
		case EASY:
			initialStability = 2.0
			interval = 2
		}

		if params != nil {
			switch grade {
			case AGAIN:
				initialStability = float64(params.W0)
			case HARD:
				initialStability = float64(params.W1)
			case GOOD:
				initialStability = float64(params.W2)
			case EASY:
				initialStability = float64(params.W3)
			}
			if initialStability > 2.0 {
				initialStability = 2.0
			}
			if initialStability < 1.0 {
				initialStability = 1.0
			}
			interval = e.stabilityToInterval(initialStability)
			if interval < 1 {
				interval = 1
			}
			if interval > 2 {
				interval = 2
			}
			if grade != EASY && interval > 1 {
				interval = 1
			}
		}

		state.Interval = float32(interval)
		state.Stability = float32(initialStability)
		state.RepetitionLevel = 1
	} else {
		// Lapsed card returning from relearning to review
		initialStability = float64(state.Stability)
		if initialStability < 1.0 {
			initialStability = 1.0
		}
		interval = e.stabilityToInterval(initialStability)
		if interval < 1 {
			interval = 1
		}
		if interval > MaxIntervalDays {
			interval = MaxIntervalDays
		}
		state.Interval = float32(initialStability)
	}

	today := e.startOfDayUTC(now)
	nextRep := today.AddDate(0, 0, interval)
	state.Retrievability = 1.0
	state.NextRepetitionDate = &nextRep

	d := e.initialDifficulty(grade, params)
	state.EaseFactor = float32(math.Max(1.3, math.Min(2.5, (11-d)/4)))
	e.updateDifficultyScore(state)

	return ReviewResult{
		NextIntervalDays:	interval,
		RepeatInSession:	false,
		NewStability:		float32(initialStability),
		LearningDue:		nil,
		LearningStep:		-1,
	}
}

func (e *Engine) reviewReviewCard(state *CardState, rating UserRating, responseTimeMs int, params *AlgorithmParams, now time.Time, prevLastReviewed *time.Time) ReviewResult {
	if rating == Forgot {
		return e.reviewForgot(state, now, params, prevLastReviewed)
	}
	return e.reviewRemember(state, responseTimeMs, params, now, prevLastReviewed)
}

func (e *Engine) reviewForgot(state *CardState, now time.Time, params *AlgorithmParams, prevLastReviewed *time.Time) ReviewResult {
	state.Lapses++
	state.HardCount++
	state.ConsecutiveSuccess = 0
	state.Status = "learning"
	state.LearningStep = 0

	currentStability := float64(state.Interval)
	if currentStability < 1 {
		currentStability = 1
	}
	d := math.Max(1, math.Min(10, float64(11-state.EaseFactor*4)))

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

	today := e.startOfDayUTC(now)
	r := e.calculateRetrievabilityFromTime(prevLastReviewed, currentStability, today)

	newStability := w11 * math.Pow(d, -w12) * (math.Pow(currentStability+1, w13) - 1) * math.Exp(w14*(1-r))
	newStability = math.Max(0.5, newStability)

	state.Interval = float32(newStability)
	state.Stability = float32(newStability)

	due := now.Add(time.Duration(LearningStepsMinutes[0]) * time.Minute)
	state.LearningDue = &due

	e.updateLeechDetection(state)
	e.updateDifficultyScore(state)

	return ReviewResult{
		NextIntervalDays:	0,
		RepeatInSession:	true,
		NewStability:		float32(newStability),
		LearningDue:		&due,
		LearningStep:		0,
	}
}

func (e *Engine) reviewRemember(state *CardState, responseTimeMs int, params *AlgorithmParams, now time.Time, prevLastReviewed *time.Time) ReviewResult {
	today := e.startOfDayUTC(now)

	stability := float64(state.Interval)
	if stability < 0.5 {
		stability = 0.5
	}
	difficulty := state.EaseFactor
	d := math.Max(1, math.Min(10, float64(11-difficulty*4)))

	r := e.calculateRetrievabilityFromTime(prevLastReviewed, stability, today)
	state.Retrievability = float32(r)

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
	state.Interval = float32(newStability)
	state.Stability = float32(newStability)
	state.EaseFactor = newEaseFactor
	state.NextRepetitionDate = &nextRep
	state.LearningDue = nil
	state.LearningStep = 0
	state.RepetitionLevel++
	state.ConsecutiveSuccess++
	state.CorrectReviews++
	state.HardCount = 0

	state.Status = "review"
	e.updateDifficultyScore(state)

	return ReviewResult{
		NextIntervalDays:	interval,
		RepeatInSession:	false,
		NewStability:		float32(newStability),
	}
}

func (e *Engine) inferGrade(responseTimeMs int) InternalGrade {
	if responseTimeMs < FastThresholdMs {
		return EASY
	}
	if responseTimeMs > SlowThresholdMs {
		return HARD
	}
	return GOOD
}

func (e *Engine) CalculateRetrievability(state *CardState, today time.Time) float64 {
	return e.calculateRetrievabilityFromTime(state.LastReviewed, float64(state.Interval), today)
}

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

func (e *Engine) calculateNewStability(s, d, r float64, grade InternalGrade, params *AlgorithmParams) float64 {
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
		easyBonus = 1.0 / w11
	}

	stabilityIncrease := math.Exp(w8) * (11 - d) * math.Pow(s, -w9) * (math.Exp(w10*(1-r)) - 1) * easyBonus
	res := s * (stabilityIncrease + 1)
	if res > float64(MaxIntervalDays)*2 {
		res = float64(MaxIntervalDays) * 2
	}
	return math.Max(1, res)
}

func (e *Engine) updateDifficulty(d float64, grade InternalGrade, params *AlgorithmParams) float64 {
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

func (e *Engine) initialDifficulty(grade InternalGrade, params *AlgorithmParams) float64 {
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

func (e *Engine) isLearningCard(state *CardState) bool {
	return state.Status == "new" || state.Status == "learning"
}

func (e *Engine) startOfDayUTC(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

func (e *Engine) updateDifficultyScore(state *CardState) {

	d := math.Max(1, math.Min(10, float64(11-state.EaseFactor*4)))
	state.DifficultyScore = float32((d - 1) / 9)
}

func (e *Engine) updateLeechDetection(state *CardState) {
	if state.Lapses >= 8 {
		state.IsLeech = true
	}
}
