package service

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCreateTranslationPrompt(t *testing.T) {
	s := &AIService{}
	
	text := "ejecutar"
	context := "Necesitamos ejecutar una prueba mañana"
	sourceLang := "es"
	targetLang := "en"
	extendedContext := "Contexto ampliado"

	isPartial := false

	prompt := s.createTranslationPrompt(text, sourceLang, targetLang, context, extendedContext, isPartial)

	// Verify key elements of the prompt
	assert.True(t, strings.Contains(prompt, "You are a precise translation API."))
	assert.True(t, strings.Contains(prompt, "TASK:"))
	assert.True(t, strings.Contains(prompt, "CRITICAL RULES:"))
	assert.True(t, strings.Contains(prompt, "OUTPUT SCHEMA:"))
	assert.True(t, strings.Contains(prompt, "EXAMPLE:"))
	assert.True(t, strings.Contains(prompt, "INPUT:"))
	
	// Verify input interpolation
	assert.True(t, strings.Contains(prompt, "Text: \"ejecutar\""))
	assert.True(t, strings.Contains(prompt, "[Used in: \"Necesitamos ejecutar una prueba mañana\"]"))
	assert.True(t, strings.Contains(prompt, "Source: es"))
}
