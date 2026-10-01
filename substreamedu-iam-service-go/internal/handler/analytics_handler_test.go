package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/substreamedu/substreamedu-iam-service/internal/model"
	"go.uber.org/zap"
)

type mockAnalyticsRepo struct {
	events []model.AnalyticsEvent
}

func newMockAnalyticsRepo() *mockAnalyticsRepo {
	return &mockAnalyticsRepo{events: make([]model.AnalyticsEvent, 0)}
}

func (m *mockAnalyticsRepo) RecordEvent(ctx context.Context, eventName string, userID, anonymousID *string, properties map[string]interface{}) error {
	m.events = append(m.events, model.AnalyticsEvent{
		ID:          int64(len(m.events) + 1),
		EventName:   eventName,
		UserID:      userID,
		AnonymousID: anonymousID,
		Properties:  properties,
		CreatedAt:   time.Now(),
	})
	return nil
}

func (m *mockAnalyticsRepo) GetAnalyticsSummary(ctx context.Context) (*model.AnalyticsSummary, error) {
	return &model.AnalyticsSummary{
		Funnel: model.FunnelStats{
			TotalVisitors:  100,
			PlayerOpened:   70,
			WordSelected:   40,
			WordSaved:      25,
			ActivationRate: 40.0,
		},
		RecentEvents: m.events,
	}, nil
}

func setupTestAnalyticsHandler() (*AnalyticsHandler, *mockAnalyticsRepo) {
	gin.SetMode(gin.TestMode)
	repo := newMockAnalyticsRepo()
	logger := zap.NewNop()
	handler := NewAnalyticsHandler(repo, logger)
	return handler, repo
}

func TestRecordEvent_Success(t *testing.T) {
	handler, repo := setupTestAnalyticsHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	payload := map[string]interface{}{
		"event":       "select_word",
		"anonymousId": "anon_abc123",
		"properties": map[string]interface{}{
			"text": "serendipity",
		},
	}
	body, _ := json.Marshal(payload)
	c.Request, _ = http.NewRequest(http.MethodPost, "/auth/events", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.RecordEvent(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	if len(repo.events) != 1 {
		t.Fatalf("expected 1 event recorded, got %d", len(repo.events))
	}
	if repo.events[0].EventName != "select_word" {
		t.Errorf("expected select_word, got %s", repo.events[0].EventName)
	}
	if repo.events[0].AnonymousID == nil || *repo.events[0].AnonymousID != "anon_abc123" {
		t.Errorf("expected anonymousId anon_abc123, got %v", repo.events[0].AnonymousID)
	}
}

func TestRecordEvent_WithAuthContext(t *testing.T) {
	handler, repo := setupTestAnalyticsHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", "user-uuid-999")

	payload := map[string]interface{}{
		"event": "save_word",
		"properties": map[string]interface{}{
			"text":   "comprehensive",
			"status": "success",
		},
	}
	body, _ := json.Marshal(payload)
	c.Request, _ = http.NewRequest(http.MethodPost, "/auth/events", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.RecordEvent(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	if len(repo.events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(repo.events))
	}
	if repo.events[0].UserID == nil || *repo.events[0].UserID != "user-uuid-999" {
		t.Errorf("expected userId user-uuid-999 from context, got %v", repo.events[0].UserID)
	}
}

func TestRecordEvent_EmptyEventName(t *testing.T) {
	handler, _ := setupTestAnalyticsHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	payload := map[string]interface{}{
		"event": "   ",
	}
	body, _ := json.Marshal(payload)
	c.Request, _ = http.NewRequest(http.MethodPost, "/auth/events", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.RecordEvent(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for empty event name, got %d", w.Code)
	}
}

func TestGetAnalytics_Success(t *testing.T) {
	handler, _ := setupTestAnalyticsHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/admin/analytics", nil)

	handler.GetAnalytics(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	data, ok := resp["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %v", resp)
	}

	funnel, ok := data["funnel"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected funnel object, got %v", data)
	}

	if funnel["activationRate"] != 40.0 {
		t.Errorf("expected activationRate 40.0, got %v", funnel["activationRate"])
	}
}
