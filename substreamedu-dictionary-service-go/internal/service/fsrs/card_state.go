package fsrs

import "time"

type CardState struct {
	Status			string
	EaseFactor		float32
	Interval		float32
	Stability		float32
	Retrievability		float32
	RepetitionLevel		int
	LearningStep		int
	LearningDue		*time.Time
	NextRepetitionDate	*time.Time
	LastReviewed		*time.Time

	TotalReviews		int
	CorrectReviews		int
	ConsecutiveSuccess	int
	Lapses			int
	HardCount		int

	RollingRetention	float32
	DifficultyScore		float32
	IsLeech			bool
}

type AlgorithmParams struct {
	W0	float32
	W1	float32
	W2	float32
	W3	float32
	W4	float32
	W5	float32
	W6	float32
	W7	float32
	W8	float32
	W9	float32
	W10	float32
	W11	float32
	W12	float32
	W13	float32
	W14	float32
}
