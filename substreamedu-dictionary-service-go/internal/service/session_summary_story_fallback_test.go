package service

import (
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
	"go.uber.org/zap"
)

func TestSessionSummaryAlgorithmicFallback(t *testing.T) {
	// AIService without any AI keys configured
	aiService := NewAIService("", "", "", nil, zap.NewNop())

	items := []dto.WordWithMeaning{
		{
			Word:    "hoarder",
			Meaning: "барахольщик",
			Context: "[Taylor] Who knew Sue was a hoarder?",
		},
		{
			Word:    "change up",
			Meaning: "change clothes (переодеться)",
			Context: "Just go change up in my room.",
		},
		{
			Word:    "run out on",
			Meaning: "abandon or leave abruptly (сбежать с)",
			Context: "[both laugh] Or I could just run out on my date, chase you down the street,",
		},
		{
			Word:    "chitchat",
			Meaning: "casual conversation or gossip (болтовня)",
			Context: "♪ And then she made my lips hurt ♪ ♪ I can hear the chitchat ♪ ♪ Take me to your love shack....",
		},
		{
			Word:    "inherit",
			Meaning: "receive by succession (унаследовать)",
			Context: "I... I got a work phone, and then I inherited your sister's phone number. -What are you talking about? How?",
		},
		{
			Word:    "nose job",
			Meaning: "cosmetic surgery on the nose (операция на носу)",
			Context: "Maybe she feels weird around me because I'm the only person that knows about her nose job.",
		},
		{
			Word:    "confess",
			Meaning: "признаться",
			Context: "So... I gotta confess, I was actually gonna ghost you for not having the full... Power Nine..",
		},
		{
			Word:    "frantic",
			Meaning: "wildly excited or anxious (безумный)",
			Context: "Being a baker is not about desperate, frantic experimentation..",
		},
		{
			Word:    "calve",
			Meaning: "back of lower leg",
			Context: "She's like a Martian. - God, my hips are huge! - Oh, please. I hate my calves. At least you guys can wear halters. I've got man shoulders..",
		},
	}

	req := dto.SessionSummaryRequest{
		Items:            items,
		LearningLanguage: "en",
		FluentLanguage:   "ru",
	}

	resp, err := aiService.GenerateSessionSummary(context.Background(), req)
	require.NoError(t, err)
	require.NotNil(t, resp)

	t.Run("Original Story is a real narrative, not a bullet list", func(t *testing.T) {
		assert.NotEmpty(t, resp.OriginalStory)
		// Must NOT contain the old ugly bullet dump format
		assert.NotContains(t, resp.OriginalStory, "Today's review session brought together")
		assert.NotContains(t, resp.OriginalStory, "• In our story context:")
		assert.NotContains(t, resp.OriginalStory, "represents")

		// Must NOT contain raw subtitle tags
		assert.NotContains(t, resp.OriginalStory, "[Taylor]")
		assert.NotContains(t, resp.OriginalStory, "[both laugh]")
		assert.NotContains(t, resp.OriginalStory, "♪")

		// Must have paragraphs
		assert.True(t, strings.Contains(resp.OriginalStory, "\n\n"), "story should have multiple paragraphs")

		// Every target word should be woven into the original story
		storyLower := strings.ToLower(resp.OriginalStory)
		for _, item := range items {
			// Some words might appear as stem/inflected (e.g. calve -> calves, inherit -> inherited)
			hasWord := strings.Contains(storyLower, strings.ToLower(item.Word)) ||
				(item.Word == "calve" && strings.Contains(storyLower, "calves")) ||
				(item.Word == "inherit" && strings.Contains(storyLower, "inherited"))
			assert.True(t, hasWord, "expected original story to contain word: %s", item.Word)
		}
	})

	t.Run("Fluent Story provides natural code-switching", func(t *testing.T) {
		assert.NotEmpty(t, resp.FluentStory)
		assert.NotContains(t, resp.FluentStory, "Today's review session brought together")
		assert.NotContains(t, resp.FluentStory, "• In our story context:")

		// Should have Russian narrative framing and English target words
		fluentLower := strings.ToLower(resp.FluentStory)
		assert.True(t, strings.Contains(fluentLower, "hoarder"))
		assert.True(t, strings.Contains(fluentLower, "chitchat"))
	})

	t.Run("Discussion Questions are diverse and open-ended", func(t *testing.T) {
		require.NotEmpty(t, resp.Questions)
		assert.GreaterOrEqual(t, len(resp.Questions), 6)

		// Must NOT all be identical robotic copy-paste lines
		firstQ := resp.Questions[0]
		identicalCount := 0
		for _, q := range resp.Questions {
			if q == firstQ {
				identicalCount++
			}
			assert.True(t, strings.HasSuffix(q, "?"), "question should end with a question mark: %s", q)
		}
		assert.Less(t, identicalCount, 3, "questions should be varied, not repeated copies")
	})
}
