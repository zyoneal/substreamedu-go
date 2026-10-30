package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
)

func TestAIService_GenerateAlgorithmicLessonPlan(t *testing.T) {
	s := &AIService{}

	t.Run("with subtitles extracted cues", func(t *testing.T) {
		req := dto.GenerateLessonRequest{
			Title:       "Inception Scene Analysis",
			TargetLevel: "B2",
			Subtitles: []dto.SubtitleCueDTO{
				{Text: "We need to go deeper into the subconscious mind.", Start: 12.5, End: 15.0},
				{Text: "An idea is like a resilient parasite.", Start: 16.0, End: 19.5},
			},
		}

		plan := s.generateAlgorithmicLessonPlan(req)
		assert.NotNil(t, plan)
		assert.Equal(t, "Inception Scene Analysis", plan.Title)
		assert.Equal(t, "B2", plan.Level)
		assert.NotEmpty(t, plan.Vocabulary)
		assert.NotEmpty(t, plan.ComprehensionQuestions)
		assert.NotEmpty(t, plan.SpeakingPrompts)
		assert.NotEmpty(t, plan.GrammarFocus)
	})

	t.Run("with empty subtitles defaults", func(t *testing.T) {
		req := dto.GenerateLessonRequest{
			Title:       "",
			TargetLevel: "",
			Subtitles:   nil,
		}

		plan := s.generateAlgorithmicLessonPlan(req)
		assert.NotNil(t, plan)
		assert.Equal(t, "Video English Immersion Lesson", plan.Title)
		assert.Equal(t, "B1", plan.Level)
		assert.Len(t, plan.Vocabulary, 3)
	})
}
