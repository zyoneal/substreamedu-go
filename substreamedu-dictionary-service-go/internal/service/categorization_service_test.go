package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
	"go.uber.org/zap"
)

func TestAIService_CategorizePhrasesHeuristic(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	aiService := NewAIService("", "", "", nil, logger)

	items := []dto.PhraseItem{
		{ID: 1, Text: "blend in"},
		{ID: 2, Text: "touch base"},
		{ID: 3, Text: "spill the tea"},
		{ID: 4, Text: "freak out"},
		{ID: 5, Text: "quantum computing"},
		{ID: 6, Text: "quarterly revenue"},
		{ID: 7, Text: "delicious pasta"},
		{ID: 8, Text: "flight ticket"},
		{ID: 9, Text: "friendly conversation"},
		{ID: 10, Text: "cinema movie"},
		{ID: 11, Text: "forest tree"},
		{ID: 12, Text: "cardio exercise"},
		{ID: 13, Text: "clean kitchen table"},
	}

	results := aiService.CategorizePhrasesHeuristic(items)
	require.Len(t, results, len(items), "Every item must have a category")

	// Phrasal verb with particle "in" -> Slang/Phrasal Verbs
	assert.Equal(t, "Slang, Idioms & Phrasal Verbs", results[1])
	// Touch base -> Work & Business (or Slang/Phrasal Verbs)
	assert.NotEmpty(t, results[2])
	// Spill the tea -> Slang, Idioms & Phrasal Verbs
	assert.Equal(t, "Slang, Idioms & Phrasal Verbs", results[3])
	// Freak out -> Slang, Idioms & Phrasal Verbs
	assert.Equal(t, "Slang, Idioms & Phrasal Verbs", results[4])
	// Tech
	assert.Equal(t, "Tech & Science", results[5])
	// Business
	assert.Equal(t, "Work & Business", results[6])
	// Food
	assert.Equal(t, "Food & Dining", results[7])
	// Travel
	assert.Equal(t, "Travel & Places", results[8])
	// Social
	assert.Equal(t, "Social & Communication", results[9])
	// Entertainment
	assert.Equal(t, "Art, Media & Entertainment", results[10])
	// Nature
	assert.Equal(t, "Nature & Environment", results[11])
	// Health
	assert.Equal(t, "Health & Fitness", results[12])
	// Daily
	assert.Equal(t, "Daily Life & Home", results[13])
}

func TestAIService_CategorizePhrasesBatch_FallbackResilience(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	// Unconfigured API keys must fall back cleanly without panic
	aiService := NewAIService("", "", "", nil, logger)

	items := []dto.PhraseItem{
		{ID: 101, Text: "figure out"},
		{ID: 102, Text: "venture capital"},
		{ID: 103, Text: "headache medication"},
	}

	results, err := aiService.CategorizePhrasesBatch(context.Background(), items)
	require.NoError(t, err)
	require.Len(t, results, 3)

	assert.Equal(t, "Slang, Idioms & Phrasal Verbs", results[101])
	assert.Equal(t, "Work & Business", results[102])
	assert.Equal(t, "Health & Fitness", results[103])
}

func TestCategoryTaxonomy_Completeness(t *testing.T) {
	assert.Len(t, CategoryTaxonomy, 12, "Should contain exactly 12 standard taxonomy categories")

	expectedCategories := []string{
		"Emotions & Traits",
		"Work & Business",
		"Tech & Science",
		"Daily Life & Home",
		"Food & Dining",
		"Travel & Places",
		"Social & Communication",
		"Art, Media & Entertainment",
		"Nature & Environment",
		"Health & Fitness",
		"Slang, Idioms & Phrasal Verbs",
		"Abstract & Philosophy",
	}

	for id, name := range CategoryTaxonomy {
		assert.GreaterOrEqual(t, id, 1)
		assert.LessOrEqual(t, id, 12)
		assert.Contains(t, expectedCategories, name)
	}
}
