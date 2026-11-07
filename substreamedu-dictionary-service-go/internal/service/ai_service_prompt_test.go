package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCreateTranslationPrompt(t *testing.T) {
	s := &AIService{}

	t.Run("Word Mode with Lemma Priority", func(t *testing.T) {
		text := "ejecutar"
		context := "Necesitamos ejecutar una prueba mañana"
		sourceLang := "Spanish"
		targetLang := "English"
		extendedContext := "Contexto ampliado"
		isPartial := false

		systemPrompt, userPrompt := s.createTranslationPrompt(text, sourceLang, targetLang, context, extendedContext, isPartial)

		assert.Contains(t, systemPrompt, "You are an ultra-fast, production-grade linguistic analysis and translation engine.")
		assert.Contains(t, systemPrompt, "Return ONLY a strictly valid JSON object")

		assert.Contains(t, userPrompt, "TASK:")
		assert.Contains(t, userPrompt, "LEMMA PRIORITY: ON")
		assert.Contains(t, userPrompt, "BASE FORM REQUIREMENT")
		assert.Contains(t, userPrompt, "VISUAL KEYWORD:")
		assert.Contains(t, userPrompt, "OUTPUT SCHEMA:")
		assert.Contains(t, userPrompt, "EXAMPLE:")
		assert.Contains(t, userPrompt, "INPUT:")
		assert.Contains(t, userPrompt, "Text: \"ejecutar\"")
		assert.Contains(t, userPrompt, "[Used in: \"Necesitamos ejecutar una prueba mañana\"]")
		assert.Contains(t, userPrompt, "Source: Spanish")
		assert.Contains(t, userPrompt, "Target: English")
	})

	t.Run("Sentence Mode", func(t *testing.T) {
		text := "How low can you go"
		context := "How low can you go? We will see."
		sourceLang := "English"
		targetLang := "Russian"
		extendedContext := ""
		isPartial := false

		systemPrompt, userPrompt := s.createTranslationPrompt(text, sourceLang, targetLang, context, extendedContext, isPartial)

		assert.NotEmpty(t, systemPrompt)
		assert.Contains(t, userPrompt, "SENTENCE / LONG PHRASE MODE")
		assert.Contains(t, userPrompt, "Translate it naturally, idiomatically, and cohesively")
	})

	t.Run("Phrase Mode", func(t *testing.T) {
		text := "run away"
		context := "They decided to run away from trouble."
		sourceLang := "English"
		targetLang := "Russian"
		extendedContext := ""
		isPartial := false

		systemPrompt, userPrompt := s.createTranslationPrompt(text, sourceLang, targetLang, context, extendedContext, isPartial)

		assert.NotEmpty(t, systemPrompt)
		assert.Contains(t, userPrompt, "PHRASE MODE")
	})
}
