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
	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-iam-service/internal/config"
	"github.com/substreamedu/substreamedu-iam-service/internal/model"
	"github.com/substreamedu/substreamedu-iam-service/internal/service"
	"go.uber.org/zap"
)

type mockUserRepo struct {
	users map[uuid.UUID]*model.User
}

func newMockUserRepo() *mockUserRepo {
	return &mockUserRepo{users: make(map[uuid.UUID]*model.User)}
}

func (m *mockUserRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	u, ok := m.users[id]
	if !ok {
		return nil, nil
	}
	return u, nil
}

func (m *mockUserRepo) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	for _, u := range m.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, nil
}

func (m *mockUserRepo) FindByTelegramToken(ctx context.Context, token string) (*model.User, error) {
	return nil, nil
}

func (m *mockUserRepo) Save(ctx context.Context, user *model.User) error {
	m.users[user.ID] = user
	return nil
}

func (m *mockUserRepo) Update(ctx context.Context, user *model.User) error {
	m.users[user.ID] = user
	return nil
}

func (m *mockUserRepo) FindAll(ctx context.Context, limit, offset int, query string, isPremium *bool, sortBy, sortOrder string) ([]model.User, error) {
	var list []model.User
	for _, u := range m.users {
		list = append(list, *u)
	}
	return list, nil
}

func (m *mockUserRepo) CountAll(ctx context.Context, query string, isPremium *bool) (int64, error) {
	return int64(len(m.users)), nil
}

func setupTestPromoHandler() (*PromoHandler, *mockUserRepo, *service.JWTService) {
	gin.SetMode(gin.TestMode)
	repo := newMockUserRepo()
	logger := zap.NewNop()
	userService := service.NewUserService(repo, logger)
	cfg := config.JWTConfig{SecretKey: "very-long-test-secret-key-that-is-at-least-32-bytes-long", Expiration: time.Hour}
	jwtService := service.NewJWTService(&cfg)
	handler := NewPromoHandler(userService, jwtService, logger)
	return handler, repo, jwtService
}

func TestApplyPromo_ValidCodes(t *testing.T) {
	handler, repo, jwtService := setupTestPromoHandler()

	validCodes := []string{"STREAMLEARN", "streamlearn", "  MPVOL5  ", "mpvol5"}

	for _, code := range validCodes {
		user := model.NewUser(uuid.New().String() + "@example.com")
		user.IsPremium = false
		_ = repo.Save(context.Background(), user)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("userID", user.ID.String())

		body, _ := json.Marshal(map[string]string{"code": code})
		c.Request, _ = http.NewRequest(http.MethodPost, "/auth/promo", bytes.NewBuffer(body))
		c.Request.Header.Set("Content-Type", "application/json")

		handler.ApplyPromo(c)

		if w.Code != http.StatusOK {
			t.Fatalf("expected status 200 for code %q, got %d: %s", code, w.Code, w.Body.String())
		}

		var resp map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		data, ok := resp["data"].(map[string]interface{})
		if !ok {
			t.Fatalf("expected data object in response, got %v", resp)
		}

		if data["isPremium"] != true {
			t.Errorf("expected isPremium to be true, got %v", data["isPremium"])
		}

		tokenStr, ok := data["token"].(string)
		if !ok || tokenStr == "" {
			t.Fatalf("expected updated JWT token in response, got %v", data["token"])
		}

		claims, err := jwtService.ValidateToken(tokenStr)
		if err != nil {
			t.Fatalf("invalid token returned: %v", err)
		}
		if !claims.IsPremium {
			t.Errorf("expected token claim isPremium to be true, got false")
		}

		// Verify repo was updated
		updatedUser, _ := repo.FindByID(context.Background(), user.ID)
		if !updatedUser.IsPremium {
			t.Errorf("expected user in repo to have IsPremium=true")
		}
	}
}

func TestApplyPromo_InvalidCode(t *testing.T) {
	handler, repo, _ := setupTestPromoHandler()

	user := model.NewUser("test@example.com")
	_ = repo.Save(context.Background(), user)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", user.ID.String())

	body, _ := json.Marshal(map[string]string{"code": "WRONG_CODE_999"})
	c.Request, _ = http.NewRequest(http.MethodPost, "/auth/promo", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.ApplyPromo(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid promo, got %d", w.Code)
	}
}

func TestApplyPromo_Unauthenticated(t *testing.T) {
	handler, _, _ := setupTestPromoHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	// No userID set in context

	body, _ := json.Marshal(map[string]string{"code": "STREAMLEARN"})
	c.Request, _ = http.NewRequest(http.MethodPost, "/auth/promo", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.ApplyPromo(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for unauthenticated request, got %d", w.Code)
	}
}

func TestApplyPromo_AlreadyPremium(t *testing.T) {
	handler, repo, _ := setupTestPromoHandler()

	user := model.NewUser("already_premium@example.com")
	user.IsPremium = true
	_ = repo.Save(context.Background(), user)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", user.ID.String())

	body, _ := json.Marshal(map[string]string{"code": "STREAMLEARN"})
	c.Request, _ = http.NewRequest(http.MethodPost, "/auth/promo", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.ApplyPromo(c)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409 Conflict for already premium user, got %d", w.Code)
	}
}
