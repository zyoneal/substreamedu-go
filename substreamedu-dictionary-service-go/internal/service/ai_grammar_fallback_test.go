package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAIService_GrammarFallback(t *testing.T) {
	s := &AIService{}

	t.Run("Negative Inversion", func(t *testing.T) {
		res := s.getGrammarFallback("Never have I seen such a movie.", "inversion", "ru")
		assert.NotNil(t, res)
		assert.Equal(t, "Negative Inversion", res.RuleName)
		assert.Equal(t, "inversion", res.StructureTag)
		assert.Equal(t, "C1", res.CefrLevel)
		assert.NotEmpty(t, res.NativeExplanation)
		assert.NotEmpty(t, res.Exercise.Options)
		assert.Contains(t, res.Exercise.AcceptedAnswers, "have I witnessed")
	})

	t.Run("Third Conditional", func(t *testing.T) {
		res := s.getGrammarFallback("If I had known, I would have gone.", "third_conditional", "uk")
		assert.NotNil(t, res)
		assert.Equal(t, "Third Conditional", res.RuleName)
		assert.Equal(t, "third_conditional", res.StructureTag)
		assert.Equal(t, "B2", res.CefrLevel)
		assert.Contains(t, res.NativeExplanation, "Нереальна умова в минулому")
	})

	t.Run("Second Conditional", func(t *testing.T) {
		res := s.getGrammarFallback("If I were you, I would study more.", "second_conditional", "es")
		assert.NotNil(t, res)
		assert.Equal(t, "Second Conditional", res.RuleName)
		assert.Equal(t, "second_conditional", res.StructureTag)
		assert.Equal(t, "B1", res.CefrLevel)
		assert.Contains(t, res.NativeExplanation, "Segundo condicional")
	})

	t.Run("Generic Fallback", func(t *testing.T) {
		res := s.getGrammarFallback("This is just a sentence.", "unknown_rule", "pl")
		assert.NotNil(t, res)
		assert.NotEmpty(t, res.RuleName)
		assert.NotEmpty(t, res.Formula)
	})
}
