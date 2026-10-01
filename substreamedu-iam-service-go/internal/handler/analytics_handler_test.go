package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/substreamedu/substreamedu-iam-service/internal/config"
	"github.com/substreamedu/substreamedu-iam-service/internal/middleware"
	"github.com/substreamedu/substreamedu-iam-service/internal/model"
	"github.com/substreamedu/substreamedu-iam-service/internal/service"
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
			TotalVisitors:            100,
			PlayerOpened:             70,
			WordSelected:             40,
			WordSaved:                25,
			Signups:                  20,
			ActivationRate:           40.0,
			RegisteredActivationRate: 200.0,
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

func setupTestJWTService() *service.JWTService {
	cfg := config.JWTConfig{
		SecretKey:  "very-long-test-secret-key-that-is-at-least-32-bytes-long",
		Expiration: time.Hour,
	}
	return service.NewJWTService(&cfg)
}

func TestRecordEvent_WhitelistedEvents(t *testing.T) {
	handler, repo := setupTestAnalyticsHandler()
	events := []string{"open_player", "select_word", "save_word", "signup", "return_d2"}

	for _, evt := range events {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		payload := map[string]interface{}{
			"event":       evt,
			"anonymousId": "anon_test123",
			"properties": map[string]interface{}{
				"source": "youtube",
			},
		}
		body, _ := json.Marshal(payload)
		c.Request, _ = http.NewRequest(http.MethodPost, "/auth/events", bytes.NewBuffer(body))
		c.Request.Header.Set("Content-Type", "application/json")

		handler.RecordEvent(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200 for whitelisted event %s, got %d: %s", evt, w.Code, w.Body.String())
		}
	}

	if len(repo.events) != len(events) {
		t.Fatalf("expected %d events recorded, got %d", len(events), len(repo.events))
	}
}

func TestRecordEvent_UnwhitelistedEvent(t *testing.T) {
	handler, repo := setupTestAnalyticsHandler()

	unwhitelisted := []string{"unknown_event", "identify", "custom_hack", "random"}

	for _, evt := range unwhitelisted {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		payload := map[string]interface{}{
			"event": evt,
		}
		body, _ := json.Marshal(payload)
		c.Request, _ = http.NewRequest(http.MethodPost, "/auth/events", bytes.NewBuffer(body))
		c.Request.Header.Set("Content-Type", "application/json")

		handler.RecordEvent(c)

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected 400 for unwhitelisted event %s, got %d", evt, w.Code)
		}
	}

	if len(repo.events) != 0 {
		t.Fatalf("expected 0 events recorded, got %d", len(repo.events))
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

func TestRecordEvent_BodySizeLimit(t *testing.T) {
	handler, _ := setupTestAnalyticsHandler()

	engine := gin.New()
	engine.POST("/auth/events", middleware.MaxBodySize(4096), handler.RecordEvent)

	// Create payload larger than 4KB (4096 bytes)
	largeString := strings.Repeat("A", 5000)
	payload := map[string]interface{}{
		"event": "select_word",
		"properties": map[string]interface{}{
			"large_data": largeString,
		},
	}
	body, _ := json.Marshal(payload)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/auth/events", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	engine.ServeHTTP(w, req)

	if w.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected 413 Payload Too Large for 5KB body, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRecordEvent_RateLimiting(t *testing.T) {
	handler, _ := setupTestAnalyticsHandler()

	// Rate limiter with limit 3 per minute
	limiter := middleware.NewRateLimiter(3, time.Minute)

	engine := gin.New()
	engine.POST("/auth/events", middleware.RateLimit(limiter), handler.RecordEvent)

	payload := []byte(`{"event":"open_player"}`)

	for i := 1; i <= 3; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/auth/events", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		req.RemoteAddr = "192.168.1.10:12345"
		engine.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("request %d expected 200, got %d", i, w.Code)
		}
	}

	// 4th request from same IP should be blocked with 429
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/auth/events", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "192.168.1.10:12345"
	engine.ServeHTTP(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("4th request expected 429 Too Many Requests, got %d", w.Code)
	}

	// Different IP should still succeed
	wDiff := httptest.NewRecorder()
	reqDiff, _ := http.NewRequest(http.MethodPost, "/auth/events", bytes.NewBuffer(payload))
	reqDiff.Header.Set("Content-Type", "application/json")
	reqDiff.RemoteAddr = "192.168.1.20:12345"
	engine.ServeHTTP(wDiff, reqDiff)

	if wDiff.Code != http.StatusOK {
		t.Fatalf("request from different IP expected 200, got %d", wDiff.Code)
	}
}

func TestGetAnalytics_AccessControl(t *testing.T) {
	handler, _ := setupTestAnalyticsHandler()
	jwtService := setupTestJWTService()

	engine := gin.New()
	adminGroup := engine.Group("/admin")
	adminGroup.Use(middleware.AuthMiddleware(jwtService))
	adminGroup.Use(middleware.AdminMiddleware())
	adminGroup.GET("/analytics", handler.GetAnalytics)

	// Case 1: Unauthenticated request (no token) -> 401 Unauthorized
	{
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/admin/analytics", nil)
		engine.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 for unauthenticated request, got %d", w.Code)
		}
	}

	// Case 2: Regular user token (Role = "USER") -> 403 Forbidden
	{
		user := model.NewUser("user@example.com")
		user.Role = model.RoleUser
		userToken, err := jwtService.GenerateToken(user)
		if err != nil {
			t.Fatalf("failed to generate user token: %v", err)
		}

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/admin/analytics", nil)
		req.Header.Set("Authorization", "Bearer "+userToken)
		engine.ServeHTTP(w, req)

		if w.Code != http.StatusForbidden {
			t.Fatalf("expected 403 for regular user token, got %d: %s", w.Code, w.Body.String())
		}
	}

	// Case 3: Admin token (Role = "ADMIN") -> 200 OK
	{
		admin := model.NewUser("admin@example.com")
		admin.Role = model.RoleAdmin
		adminToken, err := jwtService.GenerateToken(admin)
		if err != nil {
			t.Fatalf("failed to generate admin token: %v", err)
		}

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/admin/analytics", nil)
		req.Header.Set("Authorization", "Bearer "+adminToken)
		engine.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 for admin token, got %d: %s", w.Code, w.Body.String())
		}

		var resp map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		data := resp["data"].(map[string]interface{})
		funnel := data["funnel"].(map[string]interface{})
		if funnel["registeredActivationRate"] != 200.0 {
			t.Errorf("expected registeredActivationRate 200.0, got %v", funnel["registeredActivationRate"])
		}
	}
}
