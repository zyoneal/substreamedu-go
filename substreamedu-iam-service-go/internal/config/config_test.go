package config

import (
	"os"
	"testing"
	"time"
)

func TestDefaultJWTExpiration(t *testing.T) {
	os.Setenv("SECRET_KEY", "this-is-a-valid-secret-key-at-least-32-chars-long")
	os.Setenv("POSTGRES_USER_APP", "test_user")
	os.Setenv("POSTGRES_PASSWORD_APP", "test_pass")
	os.Unsetenv("JWT_EXPIRATION_MS")
	defer func() {
		os.Unsetenv("SECRET_KEY")
		os.Unsetenv("POSTGRES_USER_APP")
		os.Unsetenv("POSTGRES_PASSWORD_APP")
		os.Unsetenv("JWT_EXPIRATION_MS")
	}()

	cfg, err := Load()
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}

	expected := 30 * 24 * time.Hour // 2592000000 ms
	if cfg.JWT.Expiration != expected {
		t.Errorf("expected JWT Expiration %v, got %v", expected, cfg.JWT.Expiration)
	}
}

func TestCustomJWTExpiration(t *testing.T) {
	os.Setenv("SECRET_KEY", "this-is-a-valid-secret-key-at-least-32-chars-long")
	os.Setenv("POSTGRES_USER_APP", "test_user")
	os.Setenv("POSTGRES_PASSWORD_APP", "test_pass")
	os.Setenv("JWT_EXPIRATION_MS", "86400000") // 1 day in ms
	defer func() {
		os.Unsetenv("SECRET_KEY")
		os.Unsetenv("POSTGRES_USER_APP")
		os.Unsetenv("POSTGRES_PASSWORD_APP")
		os.Unsetenv("JWT_EXPIRATION_MS")
	}()

	cfg, err := Load()
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}

	expected := 24 * time.Hour
	if cfg.JWT.Expiration != expected {
		t.Errorf("expected JWT Expiration %v, got %v", expected, cfg.JWT.Expiration)
	}
}
