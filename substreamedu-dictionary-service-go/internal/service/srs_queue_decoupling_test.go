package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetDailyCards_DecoupledNewCardsQuota(t *testing.T) {
	sessionLimit := SessionLimit
	maxNewWords := DefaultMaxNewWords

	assert.Equal(t, 50, sessionLimit, "Session limit must be 50")
	assert.Equal(t, 15, maxNewWords, "Default max new words must be 15 (30 cards)")

	t.Run("Zero reviews due: must cap new cards at 30 (15 words), never 50", func(t *testing.T) {
		targetNew := ComputeTargetNewCards(0, sessionLimit, maxNewWords)
		assert.Equal(t, 30, targetNew, "Zero reviews due should cap new cards at exactly 30 (15 words)")
	})

	t.Run("10 reviews due: budget allows 30 new cards (total session 40 cards)", func(t *testing.T) {
		targetNew := ComputeTargetNewCards(10, sessionLimit, maxNewWords)
		assert.Equal(t, 30, targetNew)
	})

	t.Run("35 reviews due: remaining slots (15) limits new cards to 15 (total session 50 cards)", func(t *testing.T) {
		targetNew := ComputeTargetNewCards(35, sessionLimit, maxNewWords)
		assert.Equal(t, 15, targetNew)
	})

	t.Run("50 reviews due: zero new cards (session full of reviews)", func(t *testing.T) {
		targetNew := ComputeTargetNewCards(50, sessionLimit, maxNewWords)
		assert.Equal(t, 0, targetNew)
	})

	t.Run("Over capacity (75 reviews): zero new cards and no negative values", func(t *testing.T) {
		targetNew := ComputeTargetNewCards(75, sessionLimit, maxNewWords)
		assert.Equal(t, 0, targetNew)
	})
}
