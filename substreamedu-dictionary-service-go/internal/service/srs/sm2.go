package srs

import (
	"math"
	"math/rand"
	"time"

	"github.com/substreamedu/substreamedu-dictionary-service/internal/model"
)

type SM2Engine struct {
	rng *rand.Rand
}

func NewSM2Engine() *SM2Engine {
	return &SM2Engine{
		rng: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

func (e *SM2Engine) NewCard(card *model.Dictionary) {
	card.EaseFactor = 2.5
	card.Interval = 0
	card.RepetitionLevel = 0
	card.Status = "new"
	card.Stability = 0.5
	card.Retrievability = 1.0
}

func (e *SM2Engine) ProcessReview(card *model.Dictionary, rating string, responseTimeMs int) bool {
	now := time.Now()

	elapsedDays := float32(0)
	if card.LastReviewed != nil {
		elapsedDays = float32(now.Sub(*card.LastReviewed).Hours() / 24.0)
	}

	card.LastReviewed = &now
	card.TotalReviews++

	isSuccess := rating != "forgot"

	successVal := float32(0.0)
	if isSuccess {
		successVal = 1.0
	}
	if card.TotalReviews == 1 {
		card.RollingRetention = successVal
	} else {

		card.RollingRetention = (card.RollingRetention * 0.9) + (successVal * 0.1)
	}

	if !isSuccess {

		card.RepetitionLevel = 0
		card.Interval = 0

		card.EaseFactor = float32(math.Max(1.3, float64(card.EaseFactor-0.2)))
		card.Stability = float32(math.Max(0.1, float64(card.Stability*0.5)))
		card.Status = "learning"
		card.Lapses++

		if card.Lapses >= 8 || card.EaseFactor <= 1.3 || (card.TotalReviews > 5 && card.RollingRetention < 0.6) {
			card.IsLeech = true
		}

		next := now.Add(10 * time.Minute)
		card.NextRepetitionDate = &next
		card.LearningDue = nil
		card.LearningStep = 0
		return true
	}

	card.CorrectReviews++
	card.RepetitionLevel++
	card.ConsecutiveSuccess++

	if card.Stability > 0 {
		card.Retrievability = float32(math.Exp(math.Log(0.9) * float64(elapsedDays) / float64(card.Stability)))
	} else {
		card.Retrievability = 1.0
	}

	efBonus := float32(0.0)
	if responseTimeMs > 0 && responseTimeMs < 3000 {
		efBonus = 0.10
	}
	card.EaseFactor = float32(math.Min(2.5, math.Max(1.3, float64(card.EaseFactor+efBonus))))

	if card.RepetitionLevel == 1 {
		card.Stability = 1.0
	} else if card.RepetitionLevel == 2 {
		card.Stability = 5.0
	} else {
		recallBonus := 1.0 + (2.0 * (1.0 - float64(card.Retrievability)))
		card.Stability = float32(float64(card.Stability) * recallBonus * float64(card.EaseFactor))
	}

	card.Interval = float32(math.Round(float64(card.Stability)))
	if card.Interval < 1 {
		card.Interval = 1
	}

	card.Status = "review"

	days := int(card.Interval)
	if days > 2 {
		fuzzRange := float64(days) * 0.05
		if fuzzRange < 1 {
			fuzzRange = 1
		}
		jitter := (e.rng.Float64() * 2 * fuzzRange) - fuzzRange
		days = int(math.Round(float64(days) + jitter))
		if days < 1 {
			days = 1
		}
	}

	next := now.AddDate(0, 0, days)
	next = time.Date(next.Year(), next.Month(), next.Day(), 0, 0, 0, 0, next.Location())
	card.NextRepetitionDate = &next
	card.LearningDue = nil
	card.LearningStep = 0

	return false
}
