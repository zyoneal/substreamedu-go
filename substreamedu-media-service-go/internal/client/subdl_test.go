package client

import (
	"encoding/json"
	"testing"

	"github.com/substreamedu/substreamedu-media-service/internal/dto"
)

func TestSubDLUnmarshaling(t *testing.T) {
	jsonData := `{
		"status": true,
		"results": [
			{
				"imdb_id": "tt0108778",
				"tmdb_id": 1668,
				"type": "tv",
				"name": "Friends",
				"sd_id": 10908,
				"first_air_date": "1994-09-22",
				"year": 1994
			}
		],
		"subtitles": [
			{
				"subtitle_id": 12345,
				"name": "Friends - 01x04 - The One With George Stephanopoulos.EN.srt",
				"release_name": "Friends.S01E04.720p.BluRay.x264-Psychd",
				"url": "/subtitle/12345.zip",
				"season": 1,
				"episode": 4,
				"language": "English",
				"download_count": "1000"
			}
		]
	}`

	var res dto.SubDLSearchResponse
	err := json.Unmarshal([]byte(jsonData), &res)
	if err != nil {
		t.Fatalf("Failed to unmarshal: %v", err)
	}

	if len(res.Results) == 0 || res.Results[0].Name != "Friends" {
		t.Errorf("Expected result name 'Friends', got '%v'", res.Results[0].Name)
	}

	if res.Results[0].ImdbID != "tt0108778" {
		t.Errorf("Expected ImdbID 'tt0108778', got '%v'", res.Results[0].ImdbID)
	}

	if len(res.Subtitles) == 0 || res.Subtitles[0].SeasonNumber != 1 {
		t.Errorf("Expected subtitle season 1, got %d", res.Subtitles[0].SeasonNumber)
	}

	if res.Subtitles[0].EpisodeNumber != 4 {
		t.Errorf("Expected subtitle episode 4, got %d", res.Subtitles[0].EpisodeNumber)
	}

	id, _ := res.Subtitles[0].SubtitleID.Int64()
	if id != 12345 {
		t.Errorf("Expected subtitle ID 12345, got %d", id)
	}
}
