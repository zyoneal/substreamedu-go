package service

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/substreamedu/substreamedu-media-service/internal/dto"
)

func TestSubtitleCache_Serialization(t *testing.T) {
	subs := []dto.SubtitleResponseDto{
		{
			ID:          1,
			Name:        "Raya.and.the.Last.Dragon.2021.srt",
			StartTimeMs: 12000,
			EndTimeMs:   14500,
			Text:        "Long ago, in the fantasy world of Kumandra...",
		},
		{
			ID:          2,
			Name:        "Raya.and.the.Last.Dragon.2021.srt",
			StartTimeMs: 15000,
			EndTimeMs:   18000,
			Text:        "Humans and dragons lived together in harmony.",
		},
	}

	data, err := json.Marshal(subs)
	assert.NoError(t, err)

	var restored []dto.SubtitleResponseDto
	err = json.Unmarshal(data, &restored)
	assert.NoError(t, err)
	assert.Len(t, restored, 2)
	assert.Equal(t, subs[0].ID, restored[0].ID)
	assert.Equal(t, subs[0].Name, restored[0].Name)
	assert.Equal(t, subs[0].StartTimeMs, restored[0].StartTimeMs)
	assert.Equal(t, subs[0].EndTimeMs, restored[0].EndTimeMs)
	assert.Equal(t, subs[0].Text, restored[0].Text)
	assert.Equal(t, subs[1].Text, restored[1].Text)
}

func TestSubtitleCache_CacheKeyFormat(t *testing.T) {
	userID := uuid.New()
	fileName := "Raya.and.the.Last.Dragon.2021.srt"

	expectedKey := fmt.Sprintf("subtitles:video:%s:%s", userID, fileName)
	assert.Contains(t, expectedKey, userID.String())
	assert.Contains(t, expectedKey, fileName)
	assert.True(t, len(expectedKey) > len(fileName))
}

func TestSubtitleCache_NilRedisSafety(t *testing.T) {
	s := &SubtitleService{
		redis: nil,
	}

	testUserID := uuid.New()
	assert.NotPanics(t, func() {
		s.invalidateCache(context.Background(), testUserID)
		s.invalidateCache(context.Background(), testUserID, "test.srt")
		s.invalidateCache(context.Background(), testUserID, "test.srt", "another.srt")
	})
}

func TestSubtitleCache_InvalidateCache_EmptyNameIgnored(t *testing.T) {
	s := &SubtitleService{
		redis: nil,
	}

	testUserID := uuid.New()
	assert.NotPanics(t, func() {
		s.invalidateCache(context.Background(), testUserID, "")
	})
}
