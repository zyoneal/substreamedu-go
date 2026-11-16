package client

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/substreamedu/substreamedu-media-service/internal/config"
	"github.com/substreamedu/substreamedu-media-service/internal/dto"
	"go.uber.org/zap"
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

func TestSubDLClient_TimeoutAndHeaders(t *testing.T) {
	if sharedSubDLClient.Timeout < 8*time.Second {
		t.Fatalf("expected sharedSubDLClient timeout >= 8s to tolerate cold SubDL searches, got %v", sharedSubDLClient.Timeout)
	}

	var gotUserAgent, gotAccept string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotUserAgent = r.Header.Get("User-Agent")
		gotAccept = r.Header.Get("Accept")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":true,"results":[],"subtitles":[]}`))
	}))
	defer srv.Close()

	c := NewSubDLClient(&config.SubDLConfig{
		APIKey:  "test-key",
		BaseURL: srv.URL,
	}, zap.NewNop())

	res, err := c.SearchSubtitles(context.Background(), "Alvin And The Chipmunks", "EN", "movie", nil, nil, nil, nil, nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !res.Status {
		t.Fatalf("expected status=true, got false")
	}
	if gotUserAgent == "" || gotUserAgent == "Go-http-client/1.1" {
		t.Errorf("expected explicit browser/app User-Agent header, got %q", gotUserAgent)
	}
	if gotAccept != "application/json" {
		t.Errorf("expected Accept: application/json, got %q", gotAccept)
	}
}
