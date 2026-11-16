package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/substreamedu/substreamedu-media-service/internal/client"
	"github.com/substreamedu/substreamedu-media-service/internal/config"
	"go.uber.org/zap"
)

func TestExternalSubtitleService_SearchSubtitles_PropagatesError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusGatewayTimeout)
	}))
	defer srv.Close()

	subdlClient := client.NewSubDLClient(&config.SubDLConfig{
		APIKey:  "test-key",
		BaseURL: srv.URL,
	}, zap.NewNop())

	svc := NewExternalSubtitleService(subdlClient, zap.NewNop())
	_, err := svc.SearchSubtitles(context.Background(), "Alvin And The Chipmunks", "EN", "movie", nil, nil, nil, nil, nil, nil)
	if err == nil {
		t.Fatalf("expected error when SubDL upstream fails so gateway does not cache status=false as HTTP 200")
	}
}
