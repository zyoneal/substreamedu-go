package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSanitizeTimestampSec(t *testing.T) {
	neg := -5
	zero := 0
	pos := 142

	assert.Nil(t, sanitizeTimestampSec(nil))
	assert.Nil(t, sanitizeTimestampSec(&neg))

	resZero := sanitizeTimestampSec(&zero)
	if assert.NotNil(t, resZero) {
		assert.Equal(t, 0, *resZero)
	}

	resPos := sanitizeTimestampSec(&pos)
	if assert.NotNil(t, resPos) {
		assert.Equal(t, 142, *resPos)
	}
}

func TestSanitizeSourceURL(t *testing.T) {
	assert.Equal(t, "https://www.youtube.com/watch?v=abc", sanitizeSourceURL("  https://www.youtube.com/watch?v=abc  "))
	assert.Equal(t, "http://example.com/video.mp4", sanitizeSourceURL("http://example.com/video.mp4"))
	assert.Equal(t, "", sanitizeSourceURL("blob:https://substreamedu.com/12345"))
	assert.Equal(t, "", sanitizeSourceURL("javascript:alert(1)"))
	assert.Equal(t, "", sanitizeSourceURL(""))
}
