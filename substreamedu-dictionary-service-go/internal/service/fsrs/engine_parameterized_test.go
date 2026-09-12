package fsrs

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

var anchor = time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC)

func TestParameterized_StabilityCalculation(t *testing.T) {
	engine := NewEngine(NewStubClock(anchor))

	type testCase struct {
		stability	float64
		difficulty	float64
		retrievability	float64
		grade		InternalGrade
		gradeName	string
	}

	stabilities := []float64{1, 5, 15, 50, 200}
	difficulties := []float64{3.0}
	retrievabilities := []float64{0.5, 0.75, 0.95}
	grades := []struct {
		grade	InternalGrade
		name	string
	}{
		{HARD, "HARD"},
		{GOOD, "GOOD"},
		{EASY, "EASY"},
	}

	var cases []testCase
	for _, s := range stabilities {
		for _, d := range difficulties {
			for _, r := range retrievabilities {
				for _, g := range grades {
					cases = append(cases, testCase{
						stability:	s,
						difficulty:	d,
						retrievability:	r,
						grade:		g.grade,
						gradeName:	g.name,
					})
				}
			}
		}
	}

	for _, tc := range cases {
		name := fmt.Sprintf("S=%.0f_D=%.1f_R=%.2f_%s", tc.stability, tc.difficulty, tc.retrievability, tc.gradeName)
		t.Run(name, func(t *testing.T) {
			result := engine.calculateNewStability(tc.stability, tc.difficulty, tc.retrievability, tc.grade, nil)

			assert.True(t, result > tc.stability,
				"New stability (%.4f) should be greater than input (%.4f)", result, tc.stability)

			assert.True(t, result >= 1,
				"Stability floor: got %.4f", result)
			assert.True(t, result <= float64(MaxIntervalDays)*2,
				"Stability ceiling: got %.4f", result)
		})
	}
}

func TestParameterized_GradeOrdering(t *testing.T) {
	engine := NewEngine(NewStubClock(anchor))

	stabilities := []float64{1, 10, 50, 150}
	retrievabilities := []float64{0.5, 0.8, 0.95}
	ceiling := float64(MaxIntervalDays) * 2

	for _, s := range stabilities {
		for _, r := range retrievabilities {
			name := fmt.Sprintf("S=%.0f_R=%.2f", s, r)
			t.Run(name, func(t *testing.T) {
				d := 5.0

				sHard := engine.calculateNewStability(s, d, r, HARD, nil)
				sGood := engine.calculateNewStability(s, d, r, GOOD, nil)
				sEasy := engine.calculateNewStability(s, d, r, EASY, nil)

				if sEasy == ceiling && sGood == ceiling && sHard == ceiling {
					t.Skipf("All grades capped at ceiling (%.0f) — ordering invariant N/A", ceiling)
					return
				}

				assert.True(t, sEasy >= sGood,
					"EASY (%.2f) should produce higher or equal stability than GOOD (%.2f)", sEasy, sGood)
				assert.True(t, sGood >= sHard,
					"GOOD (%.2f) should produce higher or equal stability than HARD (%.2f)", sGood, sHard)
			})
		}
	}
}

func TestParameterized_LowerRetrievability_HigherStabilityGain(t *testing.T) {
	engine := NewEngine(NewStubClock(anchor))

	stabilities := []float64{5, 20, 100}
	grades := []InternalGrade{GOOD, EASY}

	for _, s := range stabilities {
		for _, g := range grades {
			name := fmt.Sprintf("S=%.0f_grade=%d", s, g)
			t.Run(name, func(t *testing.T) {
				d := 5.0

				sLowR := engine.calculateNewStability(s, d, 0.3, g, nil)
				sHighR := engine.calculateNewStability(s, d, 0.95, g, nil)

				assert.True(t, sLowR > sHighR,
					"Lower R (harder recall) should produce higher stability: lowR=%.2f, highR=%.2f", sLowR, sHighR)
			})
		}
	}
}

func TestParameterized_InitialStability_PerGrade(t *testing.T) {
	engine := NewEngine(NewStubClock(anchor))

	sAgain := engine.initialDifficulty(AGAIN, nil)
	sHard := engine.initialDifficulty(HARD, nil)
	sGood := engine.initialDifficulty(GOOD, nil)
	sEasy := engine.initialDifficulty(EASY, nil)

	assert.True(t, sEasy < sGood, "EASY should have lower difficulty than GOOD: %.2f vs %.2f", sEasy, sGood)
	assert.True(t, sGood < sHard, "GOOD should have lower difficulty than HARD: %.2f vs %.2f", sGood, sHard)
	assert.True(t, sHard < sAgain, "HARD should have lower difficulty than AGAIN: %.2f vs %.2f", sHard, sAgain)
}

func TestParameterized_StabilityToInterval_BoundaryInputs(t *testing.T) {
	engine := NewEngine(NewStubClock(anchor))

	tests := []struct {
		name		string
		stability	float64
		wantMinInterval	int
		wantMaxInterval	int
	}{
		{"Minimum stability (0.5)", 0.5, 0, 2},
		{"Low stability (1.0)", 1.0, 0, 3},
		{"Medium stability (10.0)", 10.0, 8, 12},
		{"High stability (100.0)", 100.0, 90, 110},
		{"Very high stability (500.0)", 500.0, 450, 550},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			interval := engine.stabilityToInterval(tc.stability)
			assert.True(t, interval >= tc.wantMinInterval && interval <= tc.wantMaxInterval,
				"stability=%.1f → interval=%d, expected [%d, %d]",
				tc.stability, interval, tc.wantMinInterval, tc.wantMaxInterval)
		})
	}
}

func TestParameterized_FullGraduation_AllGrades(t *testing.T) {
	responseTimes := []struct {
		name	string
		ms	int
		minStab	float32
	}{
		{"EASY (fast)", 1000, 0.3},
		{"GOOD (medium)", 5000, 0.3},
		{"HARD (slow)", 9000, 0.3},
	}

	for _, rt := range responseTimes {
		t.Run(rt.name, func(t *testing.T) {
			clock := NewStubClock(anchor)
			engine := NewEngine(clock)
			state := &CardState{Status: "new", EaseFactor: 2.5}

			engine.Review(state, Remember, rt.ms, nil)
			clock.Advance(10 * time.Minute)
			result := engine.Review(state, Remember, rt.ms, nil)

			assert.Equal(t, "review", state.Status)
			assert.False(t, result.RepeatInSession)
			assert.True(t, state.Stability > rt.minStab,
				"Stability should be > %.1f for %s, got %.4f", rt.minStab, rt.name, state.Stability)
			assert.True(t, state.EaseFactor >= 1.3 && state.EaseFactor <= 2.5,
				"EaseFactor should be in [1.3, 2.5], got %.4f", state.EaseFactor)
			assert.True(t, state.DifficultyScore >= 0 && state.DifficultyScore <= 1,
				"DifficultyScore should be in [0, 1], got %.4f", state.DifficultyScore)
		})
	}
}

func TestParameterized_ReviewWithCustomParams(t *testing.T) {
	paramSets := []struct {
		name	string
		params	*AlgorithmParams
	}{
		{
			"Higher initial stability",
			&AlgorithmParams{
				W0:	1.0, W1: 2.0, W2: 5.0, W3: 20.0,
				W4:	7.0, W5: 0.5, W6: 1.5, W7: 0.01,
				W8:	1.5, W9: 0.1, W10: 1.0, W11: 2.0, W12: 0.1,
			},
		},
		{
			"Lower initial stability",
			&AlgorithmParams{
				W0:	0.1, W1: 0.5, W2: 1.0, W3: 5.0,
				W4:	7.0, W5: 0.5, W6: 1.5, W7: 0.01,
				W8:	1.5, W9: 0.1, W10: 1.0, W11: 2.0, W12: 0.1,
			},
		},
	}

	for _, ps := range paramSets {
		t.Run(ps.name, func(t *testing.T) {
			clock := NewStubClock(anchor)
			engine := NewEngine(clock)

			stateDefault := &CardState{Status: "new", EaseFactor: 2.5}
			stateCustom := &CardState{Status: "new", EaseFactor: 2.5}

			engine.Review(stateDefault, Remember, 5000, nil)
			clock.Advance(10 * time.Minute)
			engine.Review(stateDefault, Remember, 5000, nil)

			clock.Set(anchor)
			engine.Review(stateCustom, Remember, 5000, ps.params)
			clock.Advance(10 * time.Minute)
			engine.Review(stateCustom, Remember, 5000, ps.params)

			assert.Equal(t, "review", stateDefault.Status)
			assert.Equal(t, "review", stateCustom.Status)

			assert.NotEqual(t, stateDefault.Stability, stateCustom.Stability,
				"Custom params should produce different stability")
		})
	}
}

func TestParameterized_DifficultyUpdate_AllGrades(t *testing.T) {
	engine := NewEngine(NewStubClock(anchor))
	initialDifficulties := []float64{2.0, 5.0, 8.0}

	for _, d := range initialDifficulties {
		name := fmt.Sprintf("D=%.1f", d)
		t.Run(name, func(t *testing.T) {
			dEasy := engine.updateDifficulty(d, EASY, nil)
			dGood := engine.updateDifficulty(d, GOOD, nil)
			dHard := engine.updateDifficulty(d, HARD, nil)

			assert.True(t, dEasy < dGood,
				"EASY (%.4f) should produce lower difficulty than GOOD (%.4f)", dEasy, dGood)
			assert.True(t, dHard > dGood,
				"HARD (%.4f) should produce higher difficulty than GOOD (%.4f)", dHard, dGood)

			for _, result := range []float64{dEasy, dGood, dHard} {
				assert.True(t, result >= 1 && result <= 10,
					"Difficulty must be in [1, 10], got %.4f", result)
			}
		})
	}
}
