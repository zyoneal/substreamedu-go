package repository

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func normalizeSQL(q string) string {
	return strings.Join(strings.Fields(q), " ")
}

func TestUnlockedNewProductionCardsSQL_Contract(t *testing.T) {
	q := normalizeSQL(findUnlockedNewProductionCardsSQL)

	assert.Contains(t, q, "d.user_id = $1")
	assert.Contains(t, q, "d.status = 'new'")
	assert.Contains(t, q, "d.card_type = 1")
	assert.Contains(t, q, "LIMIT $2")

	// Sibling gate: locked while a recognition sibling is not yet in 'review',
	// was reviewed today, or is due for review today (sibling burying).
	assert.Contains(t, q, "NOT EXISTS")
	assert.Contains(t, q, "s.user_id = d.user_id")
	assert.Contains(t, q, "LOWER(s.highlighted_text) = LOWER(d.highlighted_text)")
	assert.Contains(t, q, "s.card_type = 0")
	assert.Contains(t, q, "s.status <> 'review'")
	assert.Contains(t, q, "s.last_reviewed >= CURRENT_DATE")
	assert.Contains(t, q, "s.next_repetition_date <= CURRENT_DATE")
}

func TestComputeGatedSessionNewCards(t *testing.T) {
	t.Run("1 new word on day 1 (1 recognition new, 0 unlocked production) yields 1 session new card", func(t *testing.T) {
		gotCards, gotWords := ComputeGatedSessionNewCards(0, 1, 0, true)
		assert.Equal(t, int64(1), gotCards)
		assert.Equal(t, int64(1), gotWords)
	})

	t.Run("Day 2 with 0 new recognition and 1 unlocked production yields 1 session new card", func(t *testing.T) {
		gotCards, gotWords := ComputeGatedSessionNewCards(1, 0, 1, true)
		assert.Equal(t, int64(1), gotCards)
		assert.Equal(t, int64(1), gotWords)
	})

	t.Run("Full deck caps recognition at 15 and fills remaining 15 with unlocked production", func(t *testing.T) {
		gotCards, gotWords := ComputeGatedSessionNewCards(0, 25, 20, true)
		assert.Equal(t, int64(30), gotCards)
		assert.Equal(t, int64(15), gotWords)
	})

	t.Run("Gate disabled falls back to total new cards capped at 30", func(t *testing.T) {
		gotCards, gotWords := ComputeGatedSessionNewCards(0, 1, 0, false)
		// When gate disabled, caller passes totalNewCards in recognition+production
		assert.Equal(t, int64(1), gotCards)
		assert.Equal(t, int64(1), gotWords)
	})
}

func TestNewRecognitionCardsSQL_Contract(t *testing.T) {
	q := normalizeSQL(findNewRecognitionCardsSQL)

	assert.Contains(t, q, "user_id = $1")
	assert.Contains(t, q, "status = 'new'")
	assert.Contains(t, q, "card_type <> 1", "production cards must never come from the ungated query")
	assert.Contains(t, q, "LIMIT $2")
}

func TestNewCardQueries_AreParameterised(t *testing.T) {
	for name, q := range map[string]string{
		"production":  findUnlockedNewProductionCardsSQL,
		"recognition": findNewRecognitionCardsSQL,
	} {
		t.Run(name, func(t *testing.T) {
			assert.NotContains(t, q, "%s", "no string-formatted values in SQL")
			assert.NotContains(t, q, "%d", "no string-formatted values in SQL")
		})
	}
}
