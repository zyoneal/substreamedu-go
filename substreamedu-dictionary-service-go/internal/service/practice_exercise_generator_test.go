package service

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
)

func TestAlgorithmicExercises_WholeWordReplacedNoTrailingSuffix(t *testing.T) {
	aiService := &AIService{}

	items := []dto.WordWithMeaning{
		{
			Word:    "demolish",
			Meaning: "сносить",
			Context: "Mm-hmm. I mean, I knew it was being demolished, but to be replaced by one of those? Really?",
		},
		{
			Word:    "blindside",
			Meaning: "застать врасплох",
			Context: "She made a monumental decision alone. And then blindsided us. And I'm supposed to just smile and act like everything's okay?",
		},
		{
			Word:    "fearlessness",
			Meaning: "бесстрашие",
			Context: "I mean, some of this is beyond cringe, but there's a fearlessness here.",
		},
		{
			Word:    "grieving",
			Meaning: "скорбящий",
			Context: "Yeah, I mean, she was grieving.",
		},
	}

	resp := aiService.generateAlgorithmicExercises(items)
	require.NotNil(t, resp)
	require.Len(t, resp.Exercises, 4)

	// Exercise 1: demolish -> demolished in context
	ex1 := resp.Exercises[0]
	assert.Equal(t, "demolish", ex1.TargetWord)
	assert.False(t, strings.Contains(ex1.Prompt, "______ed"),
		"Prompt must NOT clip trailing suffix like ______ed! Actual: %s", ex1.Prompt)
	assert.True(t, strings.Contains(ex1.Prompt, "being ______"),
		"Prompt should blank the whole inflected word: %s", ex1.Prompt)
	assert.Contains(t, ex1.AcceptedAnswers, "demolish")
	assert.Contains(t, ex1.AcceptedAnswers, "demolished")

	// Exercise 2: blindside -> blindsided in context
	ex2 := resp.Exercises[1]
	assert.Equal(t, "blindside", ex2.TargetWord)
	assert.False(t, strings.Contains(ex2.Prompt, "______d"),
		"Prompt must NOT clip trailing suffix like ______d! Actual: %s", ex2.Prompt)
	assert.True(t, strings.Contains(ex2.Prompt, "then ______ us"),
		"Prompt should blank the whole word blindsided: %s", ex2.Prompt)
	assert.Contains(t, ex2.AcceptedAnswers, "blindside")
	assert.Contains(t, ex2.AcceptedAnswers, "blindsided")
}

func TestAlgorithmicExercises_AcceptedAnswersDeduplicated(t *testing.T) {
	aiService := &AIService{}

	items := []dto.WordWithMeaning{
		{
			Word:    "give 'em hell",
			Meaning: "задать им жару",
			Context: "Or you could use it to give 'em hell.",
		},
		{
			Word:    "Apparently",
			Meaning: "судя по всему",
			Context: "-Apparently.",
		},
	}

	resp := aiService.generateAlgorithmicExercises(items)
	require.NotNil(t, resp)
	require.Len(t, resp.Exercises, 2)

	for _, ex := range resp.Exercises {
		seen := make(map[string]bool)
		for _, ans := range ex.AcceptedAnswers {
			assert.False(t, seen[ans], "Duplicate answer '%s' found in accepted_answers: %v", ans, ex.AcceptedAnswers)
			seen[ans] = true
		}
	}

	// For already lowercase word: should only have 1 accepted answer, not duplicated
	ex0 := resp.Exercises[0]
	assert.Equal(t, []string{"give 'em hell"}, ex0.AcceptedAnswers)

	// For capitalized word: both original case and lowercase
	ex1 := resp.Exercises[1]
	assert.Equal(t, []string{"Apparently", "apparently"}, ex1.AcceptedAnswers)
}

func TestAlgorithmicExercises_DistractorsAreRandomized(t *testing.T) {
	aiService := &AIService{}

	items := []dto.WordWithMeaning{
		{Word: "fearlessness", Meaning: "бесстрашие", Context: "There is fearlessness here."},
		{Word: "grieving", Meaning: "скорбящий", Context: "She was grieving."},
		{Word: "dyke", Meaning: "лесбиянка", Context: "Janis lan, dyke."},
		{Word: "clique", Meaning: "группировка", Context: "Every clique has problems."},
		{Word: "underwhelmed", Meaning: "не впечатлённый", Context: "I seem underwhelmed."},
		{Word: "deny", Meaning: "отрицать", Context: "Won't deny the lies."},
		{Word: "begets", Meaning: "порождать", Context: "Decision begets another."},
		{Word: "awesomeness", Meaning: "крутость", Context: "Soak up each other's awesomeness."},
		{Word: "egregious", Meaning: "вопиющий", Context: "Some egregious miscarriage of justice."},
		{Word: "grounded", Meaning: "наказанный", Context: "She is grounded."},
		{Word: "hazing", Meaning: "подшучивать", Context: "He is hazing you."},
		{Word: "skank", Meaning: "потаскуха", Context: "The nastiest skank."},
	}

	resp := aiService.generateAlgorithmicExercises(items)
	require.NotNil(t, resp)
	require.Len(t, resp.Exercises, len(items))

	// Collect the 3 distractors for each exercise (options minus target_word)
	distractorSets := make([]string, len(resp.Exercises))
	for i, ex := range resp.Exercises {
		assert.Len(t, ex.Options, 4, "Every exercise must have exactly 4 options")
		assert.Contains(t, ex.Options, ex.TargetWord, "Options must contain target word")

		var distractors []string
		for _, opt := range ex.Options {
			if !strings.EqualFold(opt, ex.TargetWord) {
				distractors = append(distractors, opt)
			}
		}
		assert.Len(t, distractors, 3, "Must have exactly 3 distractors")
		distractorSets[i] = strings.Join(distractors, ",")
	}

	// In the buggy implementation, nearly all exercises had identical distractors ("dyke,fearlessness,grieving")
	// In the fixed implementation, there should be substantial variance across 12 exercises
	uniqueDistractorSets := make(map[string]bool)
	for _, ds := range distractorSets {
		uniqueDistractorSets[ds] = true
	}

	assert.GreaterOrEqual(t, len(uniqueDistractorSets), 6,
		"Expected high variance in distractor sets across 12 exercises, got %d distinct sets: %v",
		len(uniqueDistractorSets), distractorSets)
}
