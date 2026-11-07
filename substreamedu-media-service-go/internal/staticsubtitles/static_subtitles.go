package staticsubtitles

import (
	"embed"
	"encoding/json"
	"fmt"

	"github.com/substreamedu/substreamedu-media-service/internal/dto"
)

//go:embed *.json
var staticSubtitlesFS embed.FS

// Get returns pre-embedded subtitle cues for curated demo videos, if available.
func Get(videoID string) ([]dto.SubtitleResponseDto, bool) {
	data, err := staticSubtitlesFS.ReadFile(fmt.Sprintf("%s.json", videoID))
	if err != nil {
		return nil, false
	}
	var subs []dto.SubtitleResponseDto
	if err := json.Unmarshal(data, &subs); err != nil {
		return nil, false
	}
	return subs, true
}
