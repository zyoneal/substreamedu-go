package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/model"
)

func TestInterleaveCards_Empty(t *testing.T) {
	result := interleaveCards(nil)
	assert.Nil(t, result)
}

func TestInterleaveCards_SingleCard(t *testing.T) {
	cards := []model.Dictionary{{ID: 1, Word: "hello"}}
	result := interleaveCards(cards)
	assert.Len(t, result, 1)
}

func TestInterleaveCards_TwoCards_SameWord(t *testing.T) {
	cards := []model.Dictionary{
		{ID: 1, Word: "hello", CardType: 0},
		{ID: 2, Word: "hello", CardType: 1},
	}
	result := interleaveCards(cards)
	assert.Len(t, result, 2)

}

func TestInterleaveCards_PreservesAllCards(t *testing.T) {
	cards := []model.Dictionary{
		{ID: 1, Word: "apple"}, {ID: 2, Word: "apple"},
		{ID: 3, Word: "banana"}, {ID: 4, Word: "banana"},
		{ID: 5, Word: "cherry"}, {ID: 6, Word: "cherry"},
	}
	result := interleaveCards(cards)
	assert.Len(t, result, 6, "Should preserve all cards")

	ids := map[int64]bool{}
	for _, c := range result {
		ids[c.ID] = true
	}
	assert.Len(t, ids, 6, "No duplicate or lost cards")
}

func TestInterleaveCards_NoSameWordAdjacency(t *testing.T) {

	for attempt := 0; attempt < 50; attempt++ {
		cards := []model.Dictionary{
			{ID: 1, Word: "apple", CardType: 0}, {ID: 2, Word: "apple", CardType: 1},
			{ID: 3, Word: "banana", CardType: 0}, {ID: 4, Word: "banana", CardType: 1},
			{ID: 5, Word: "cherry", CardType: 0}, {ID: 6, Word: "cherry", CardType: 1},
			{ID: 7, Word: "date", CardType: 0}, {ID: 8, Word: "date", CardType: 1},
		}
		result := interleaveCards(cards)

		for i := 0; i < len(result)-1; i++ {
			if result[i].Word == result[i+1].Word {
				t.Errorf("Attempt %d: Same-word adjacency at positions %d,%d: word=%s",
					attempt, i, i+1, result[i].Word)
			}
		}
	}
}

func TestInterleaveCards_AllSameWord_NoError(t *testing.T) {
	cards := []model.Dictionary{
		{ID: 1, Word: "hello", CardType: 0},
		{ID: 2, Word: "hello", CardType: 1},
		{ID: 3, Word: "hello", CardType: 2},
	}

	assert.NotPanics(t, func() {
		result := interleaveCards(cards)
		assert.Len(t, result, 3)
	}, "Should not panic with all same word")
}

func TestInterleaveCards_MixedSingleAndPairedWords(t *testing.T) {
	cards := []model.Dictionary{
		{ID: 1, Word: "alpha", CardType: 0},
		{ID: 2, Word: "beta", CardType: 0}, {ID: 3, Word: "beta", CardType: 1},
		{ID: 4, Word: "gamma", CardType: 0},
		{ID: 5, Word: "delta", CardType: 0}, {ID: 6, Word: "delta", CardType: 1},
	}

	for attempt := 0; attempt < 30; attempt++ {
		result := interleaveCards(cards)
		assert.Len(t, result, 6)

		for i := 0; i < len(result)-1; i++ {
			if result[i].Word == result[i+1].Word {
				t.Errorf("Attempt %d: adjacency at %d,%d: %s", attempt, i, i+1, result[i].Word)
			}
		}
	}
}
