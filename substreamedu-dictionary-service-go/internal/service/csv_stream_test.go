package service

import (
	"bytes"
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/model"
)

func TestStreamCsv(t *testing.T) {
	s := &VocabularyService{}

	items := []model.Dictionary{
		{
			Word:          "serendipity",
			Transcription: "ˌsɛrənˈdɪpɪti",
			Context:       "Finding that book was pure serendipity.",
			Definition:    "finding valuable things not sought for",
			Translation:   "щасливий випадок",
			ImageUrl:      "https://example.com/serendipity.jpg",
		},
		{
			Word:        "epiphany",
			Definition:  "a moment of sudden revelation",
			Translation: "прозріння",
			ImageUrl:    "",
		},
	}

	t.Run("Streams CSV matching expected format", func(t *testing.T) {
		var buf bytes.Buffer
		err := s.streamCsv(context.Background(), items, &buf)
		assert.NoError(t, err)

		content := buf.String()
		assert.True(t, strings.HasPrefix(content, "#sep:;\n#model:SubstreamEDU (Reversed) V11\n#columns:Front;Back;Image\n"))
		assert.Contains(t, content, "serendipity [ˌsɛrənˈdɪpɪti] - Finding that book was pure serendipity.;finding valuable things not sought for (щасливий випадок);https://example.com/serendipity.jpg")
		assert.Contains(t, content, "epiphany;a moment of sudden revelation (прозріння);")
	})

	t.Run("Context cancellation terminates stream", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Cancel immediately

		var buf bytes.Buffer
		err := s.streamCsv(ctx, items, &buf)
		assert.ErrorIs(t, err, context.Canceled)
	})

	t.Run("Matches expected CSV content", func(t *testing.T) {
		var buf bytes.Buffer
		_ = s.streamCsv(context.Background(), items, &buf)
		expected := "#sep:;\n#model:SubstreamEDU (Reversed) V11\n#columns:Front;Back;Image\nserendipity [ˌsɛrənˈdɪpɪti] - Finding that book was pure serendipity.;finding valuable things not sought for (щасливий випадок);https://example.com/serendipity.jpg\nepiphany;a moment of sudden revelation (прозріння);\n"

		assert.Equal(t, expected, buf.String())
	})
}

func TestAnkiExportLimit(t *testing.T) {
	t.Run("ExportDictionaryAsAnki rejects when exceeding maxLimit", func(t *testing.T) {
		assert.Equal(t, "export limit exceeded: maximum allowed cards is 2,500", ErrExportLimitExceeded.Error())
	})
}
