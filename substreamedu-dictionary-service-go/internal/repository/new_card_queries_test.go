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

	// Sibling gate: locked while a recognition sibling is not yet in 'review'.
	assert.Contains(t, q, "NOT EXISTS")
	assert.Contains(t, q, "s.user_id = d.user_id")
	assert.Contains(t, q, "s.highlighted_text = d.highlighted_text")
	assert.Contains(t, q, "s.card_type = 0")
	assert.Contains(t, q, "s.status <> 'review'")
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
