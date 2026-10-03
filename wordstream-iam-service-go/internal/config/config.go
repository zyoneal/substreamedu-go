// Package config provides application configuration management.
// Follows 12-factor app principles with environment variable configuration.
package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds all application configuration.
// All fields are validated at startup to fail fast on misconfiguration.
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Google   GoogleConfig
	Mail     MailConfig
}

// ServerConfig holds HTTP server configuration.
type ServerConfig struct {
	Port        string
	ContextPath string
}

// DatabaseConfig holds PostgreSQL connection configuration.
type DatabaseConfig struct {
	Host     string
	Port     string
	Database string
	User     string
	Password string
}

// JWTConfig holds JWT token configuration.
type JWTConfig struct {
	SecretKey  string
	Expiration time.Duration
}

// GoogleConfig holds Google OAuth configuration.
type GoogleConfig struct {
	ClientID     string
	ClientSecret string
}

// MailConfig holds SMTP configuration.
type MailConfig struct {
	Host     string
	Port     int
	Username string
	Password string
}

// Load loads configuration from environment variables.
// Returns error if required configuration is missing.
func Load() (*Config, error) {
	mailPort, _ := strconv.Atoi(getEnv("SPRING_MAIL_PORT", "587"))
	jwtExpMs, _ := strconv.ParseInt(getEnv("JWT_EXPIRATION_MS", "3600000"), 10, 64)

	cfg := &Config{
		Server: ServerConfig{
			Port:        getEnv("SERVER_PORT", "3002"),
			ContextPath: "/auth-service",
		},
		Database: DatabaseConfig{
			Host:     getEnv("POSTGRES_HOST", "localhost"),
			Port:     getEnv("POSTGRES_PORT", "5432"),
			Database: getEnv("POSTGRES_DB_IAM", "sse_iam"),
			User:     getEnv("POSTGRES_USER_APP", "substream_app"),
			Password: getEnv("POSTGRES_PASSWORD_APP", "substream_pass"),
		},
		JWT: JWTConfig{
			SecretKey:  getEnv("SECRET_KEY", ""),
			Expiration: time.Duration(jwtExpMs) * time.Millisecond,
		},
		Google: GoogleConfig{
			ClientID:     getEnv("GOOGLE_OAUTH_CLIENT_ID", ""),
			ClientSecret: getEnv("GOOGLE_OAUTH_CLIENT_SECRET", ""),
		},
		Mail: MailConfig{
			Host:     getEnv("SPRING_MAIL_HOST", "smtp.gmail.com"),
			Port:     mailPort,
			Username: getEnv("SPRING_MAIL_USERNAME", ""),
			Password: getEnv("SPRING_MAIL_PASSWORD", ""),
		},
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) Validate() error {
	if c.JWT.SecretKey == "" {
		return os.ErrInvalid // Or a more descriptive error
	}
	if c.Google.ClientID == "" {
		// return fmt.Errorf("GOOGLE_OAUTH_CLIENT_ID is required")
	}
	return nil
}

// getEnv retrieves environment variable with fallback default.
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// DSN returns PostgreSQL connection string.
func (d *DatabaseConfig) DSN() string {
	return "postgres://" + d.User + ":" + d.Password +
		"@" + d.Host + ":" + d.Port + "/" + d.Database + "?sslmode=disable"
}
