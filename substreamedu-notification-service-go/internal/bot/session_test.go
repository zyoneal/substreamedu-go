package bot

import (
	"testing"

	"github.com/substreamedu/substreamedu-notification-service/internal/dto"
)

func TestReviewSessionLifecycle(t *testing.T) {
	words := []dto.DictionaryItemResponse{
		{ID: 1, HighlightedText: "hello"},
		{ID: 2, HighlightedText: "world"},
	}
	s := NewReviewSession(words)

	if !s.HasNext() {
		t.Error("expected HasNext to be true")
	}
	if s.GetTotal() != 2 {
		t.Errorf("expected total 2, got %d", s.GetTotal())
	}

	first := s.Next()
	if first == nil || first.ID != 1 {
		t.Errorf("expected first word ID 1, got %v", first)
	}

	s.RecordAnswer("easy")
	s.RecordAnswer("normal")

	if s.GetAccuracyPercent() != 100 {
		t.Errorf("expected 100%% accuracy, got %.0f%%", s.GetAccuracyPercent())
	}
}

func TestReviewSessionEmpty(t *testing.T) {
	s := NewReviewSession(nil)
	if s.HasNext() {
		t.Error("expected HasNext to be false for nil words")
	}
	if s.GetTotal() != 0 {
		t.Errorf("expected total 0, got %d", s.GetTotal())
	}
	if s.Next() != nil {
		t.Error("expected Next to return nil for empty session")
	}
	if s.GetAccuracyPercent() != 0 {
		t.Errorf("expected 0%% accuracy for no answers, got %.0f%%", s.GetAccuracyPercent())
	}
}

func TestReviewSessionRemembersAnswers(t *testing.T) {
	words := []dto.DictionaryItemResponse{{ID: 1, HighlightedText: "hello"}}
	s := NewReviewSession(words)

	s.RecordAnswer("hard")
	s.RecordAnswer("forgot")
	s.RecordAnswer("normal")
	s.RecordAnswer("easy")
	s.RecordAnswer("remember")

	if s.GetAccuracyPercent() != 60 {
		t.Errorf("expected 60%% accuracy (3/5), got %.0f%%", s.GetAccuracyPercent())
	}
}
