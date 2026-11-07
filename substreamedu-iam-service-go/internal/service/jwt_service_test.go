package service

import (
	"testing"
	"time"

	"github.com/substreamedu/substreamedu-iam-service/internal/config"
	"github.com/substreamedu/substreamedu-iam-service/internal/model"
)

func TestJWTTokenLifecycle(t *testing.T) {
	cfg := config.JWTConfig{SecretKey: "this-is-a-very-long-secret-key-for-testing-123456", Expiration: time.Hour}
	svc := NewJWTService(&cfg)

	user := model.NewUser("test@example.com")
	token, err := svc.GenerateToken(user)
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}
	if token == "" {
		t.Fatal("token is empty")
	}

	claims, err := svc.ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
	if claims.ID != user.ID.String() {
		t.Errorf("expected userID %s, got %s", user.ID.String(), claims.ID)
	}
	if claims.Role != user.Role {
		t.Errorf("expected role %s, got %s", user.Role, claims.Role)
	}
}

func TestJWTInvalidToken(t *testing.T) {
	cfg := config.JWTConfig{SecretKey: "this-is-a-very-long-secret-key-for-testing-123456", Expiration: time.Hour}
	svc := NewJWTService(&cfg)

	_, err := svc.ValidateToken("invalid-token")
	if err == nil {
		t.Error("expected error for invalid token, got nil")
	}
}
