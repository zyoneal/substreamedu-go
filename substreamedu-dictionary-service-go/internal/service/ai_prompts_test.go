package service

import (
	"strings"
	"testing"
)

func TestAIPromptParseQuestionsResponse(t *testing.T) {
	t.Run("JSON array format", func(t *testing.T) {
		raw := `["What happened first?", "Why did they leave?"]`
		questions := parseQuestionsResponse(raw)
		if len(questions) != 2 {
			t.Fatalf("expected 2 questions, got %d", len(questions))
		}
		if questions[0] != "What happened first?" {
			t.Errorf("unexpected question: %s", questions[0])
		}
	})

	t.Run("JSON object wrapper", func(t *testing.T) {
		raw := `{"questions": ["Where is the station?", "Who was calling?"]}`
		questions := parseQuestionsResponse(raw)
		if len(questions) != 2 {
			t.Fatalf("expected 2 questions, got %d", len(questions))
		}
		if questions[1] != "Who was calling?" {
			t.Errorf("unexpected question: %s", questions[1])
		}
	})

	t.Run("Markdown wrapped JSON", func(t *testing.T) {
		raw := "```json\n[\"How long did it take?\"]\n```"
		questions := parseQuestionsResponse(raw)
		if len(questions) != 1 {
			t.Fatalf("expected 1 question, got %d", len(questions))
		}
		if questions[0] != "How long did it take?" {
			t.Errorf("unexpected question: %s", questions[0])
		}
	})

	t.Run("Numbered list fallback", func(t *testing.T) {
		raw := "1. What is the main idea?\n2. Why does the author argue this?"
		questions := parseQuestionsResponse(raw)
		if len(questions) != 2 {
			t.Fatalf("expected 2 questions, got %d", len(questions))
		}
		if questions[0] != "What is the main idea?" {
			t.Errorf("unexpected question: %s", questions[0])
		}
	})
}

func TestPromptHelpers(t *testing.T) {
	svc := &AIService{}

	t.Run("createTranslationPrompt word vs sentence", func(t *testing.T) {
		sysPrompt, userPromptWord := svc.createTranslationPrompt("run", "en", "ru", "I run every day", "", false)
		if sysPrompt == "" || !strings.Contains(userPromptWord, "LEMMA PRIORITY: ON") {
			t.Errorf("expected lemma priority in word prompt")
		}

		_, userPromptSentence := svc.createTranslationPrompt("how low can you go", "en", "ru", "how low can you go?", "", false)
		if !strings.Contains(userPromptSentence, "SENTENCE / LONG PHRASE MODE") {
			t.Errorf("expected sentence mode in long phrase prompt")
		}
	})

	t.Run("createCEFRLevelPrompt levels", func(t *testing.T) {
		promptA1 := svc.createCEFRLevelPrompt("A1", "English", "travel")
		if !strings.Contains(promptA1, "basic vocabulary") {
			t.Errorf("expected basic vocabulary for A1, got %s", promptA1)
		}
		promptC1 := svc.createCEFRLevelPrompt("C1", "English", "science")
		if !strings.Contains(promptC1, "highly advanced") {
			t.Errorf("expected highly advanced for C1, got %s", promptC1)
		}
	})

	t.Run("getMaxTokensForLevel", func(t *testing.T) {
		if svc.getMaxTokensForLevel("A1") != 350 {
			t.Errorf("expected 350 for A1")
		}
		if svc.getMaxTokensForLevel("C1") != 550 {
			t.Errorf("expected 550 for C1")
		}
		if svc.getMaxTokensForLevel("unknown") != 450 {
			t.Errorf("expected 450 default")
		}
	})

	t.Run("calculateOptimalMaxTokens", func(t *testing.T) {
		if svc.calculateOptimalMaxTokens("short") != 400 {
			t.Errorf("expected 400 for short text")
		}
		if svc.calculateOptimalMaxTokens("one two three four five six") != 500 {
			t.Errorf("expected 500 for medium text")
		}
		if svc.calculateOptimalMaxTokens("one two three four five six seven eight nine ten eleven twelve") != 600 {
			t.Errorf("expected 600 for long text")
		}
	})
}
