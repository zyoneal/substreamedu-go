package staticsubtitles

import (
	"testing"
)

func TestGet(t *testing.T) {
	testIDs := []string{
		"hsUkTQ1YTOQ",
		"d9gkFenaKFs",
		"BnRub9D5Ch8",
		"b5DOQ7iOzO4",
	}

	for _, id := range testIDs {
		subs, ok := Get(id)
		if !ok {
			t.Fatalf("expected subtitles for %s to be embedded, got false", id)
		}
		if len(subs) == 0 {
			t.Fatalf("expected non-empty subtitles for %s", id)
		}
		if subs[0].Text == "" {
			t.Errorf("expected first cue text not to be empty for %s", id)
		}
	}

	_, ok := Get("non-existent-id")
	if ok {
		t.Errorf("expected non-existent ID to return false, got true")
	}
}
