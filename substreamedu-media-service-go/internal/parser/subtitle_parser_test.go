package parser

import (
	"testing"
)

func TestCleanSubtitleText(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "ASS hard linebreak \\N between words",
			input:    `He will be\Nif anyone finds out about this accident.`,
			expected: "He will be if anyone finds out about this accident.",
		},
		{
			name:     "ASS italics override tags",
			input:    `{\i1}I'm Teagan Tao.{\i0}`,
			expected: "I'm Teagan Tao.",
		},
		{
			name:     "ASS hard linebreak with punctuation",
			input:    `Remember, stay within your pace,\Nkeep it steady. You got this!`,
			expected: "Remember, stay within your pace, keep it steady. You got this!",
		},
		{
			name:     "Dialogue with ASS tags and \\N",
			input:    `- Go, Teagan, whoo!\N- {\i1}...tries.{\i0}`,
			expected: "- Go, Teagan, whoo! - ...tries.",
		},
		{
			name:     "ASS hard space \\h",
			input:    `WordOne\hWordTwo`,
			expected: "WordOne WordTwo",
		},
		{
			name:     "Complex ASS tags and HTML",
			input:    `{\an8\c&HFFFFFF&}<i>Hello</i> <b>World</b> &amp; &quot;Friends&quot;`,
			expected: `Hello World & "Friends"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CleanSubtitleText(tt.input)
			if got != tt.expected {
				t.Errorf("CleanSubtitleText() = %q, want %q", got, tt.expected)
			}
		})
	}
}

func TestParseSrt_CleansASSTags(t *testing.T) {
	lines := []string{
		"1",
		"00:01:00,000 --> 00:01:05,000",
		`{\i1}I'm Teagan Tao.{\i0}`,
		"",
		"2",
		"00:01:06,000 --> 00:01:10,000",
		`He will be\Nif anyone finds out about this accident.`,
	}

	subs := ParseSrt(lines)
	if len(subs) != 2 {
		t.Fatalf("expected 2 subtitles, got %d", len(subs))
	}

	if subs[0].Text != "I'm Teagan Tao." {
		t.Errorf("subs[0].Text = %q, want %q", subs[0].Text, "I'm Teagan Tao.")
	}
	if subs[1].Text != "He will be if anyone finds out about this accident." {
		t.Errorf("subs[1].Text = %q, want %q", subs[1].Text, "He will be if anyone finds out about this accident.")
	}
}
