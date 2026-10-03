// Package config provides application configuration management.
package config

import (
	"fmt"
	"os"
)

// Config holds all application configuration.
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	YouTube  YouTubeConfig
	Spotify  SpotifyConfig
	SubDL    SubDLConfig
	DeepSeek    DeepSeekConfig
	Redis       RedisConfig
}

// ServerConfig holds HTTP server configuration.
type ServerConfig struct {
	Port        string
	ContextPath string
}

// DatabaseConfig holds PostgreSQL configuration.
type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Database string
}

// DSN returns the PostgreSQL connection string.
func (c DatabaseConfig) DSN() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		c.User, c.Password, c.Host, c.Port, c.Database)
}

// YouTubeConfig holds YouTube API configuration.
type YouTubeConfig struct {
	APIKey string
}

// SpotifyConfig holds Spotify API configuration.
type SpotifyConfig struct {
	ClientID     string
	ClientSecret string
}

// SubDLConfig holds SubDL API configuration.
type SubDLConfig struct {
	APIKey  string
	BaseURL string
}

// DeepSeekConfig holds DeepSeek API configuration.
type DeepSeekConfig struct {
	APIKey string
}

// RedisConfig holds Redis configuration.
type RedisConfig struct {
	Addr     string
	Password string
	DB       int
}

// Load loads configuration from environment variables.
func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port:        getEnv("SERVER_PORT", "3004"),
			ContextPath: "/media-service",
		},
		Database: DatabaseConfig{
			Host:     getEnv("POSTGRES_HOST", "localhost"),
			Port:     getEnv("POSTGRES_PORT", "5432"),
			User:     getEnv("POSTGRES_USER_APP", "substream_app"),
			Password: getEnv("POSTGRES_PASSWORD_APP", "substream_pass"),
			Database: getEnv("POSTGRES_DB_MEDIA", "wordstream_media"),
		},
		YouTube: YouTubeConfig{
			APIKey: getEnv("YOUTUBE_API_KEY", ""),
		},
		Spotify: SpotifyConfig{
			ClientID:     getEnv("SPOTIFY_CLIENT_ID", ""),
			ClientSecret: getEnv("SPOTIFY_CLIENT_SECRET", ""),
		},
		SubDL: SubDLConfig{
			APIKey:  getEnv("SUBDL_API_KEY", ""),
			BaseURL: getEnv("SUBDL_BASE_URL", "https://api.subdl.com/api/v1"),
		},
		DeepSeek: DeepSeekConfig{
			APIKey: getEnv("DEEPSEEK_API_KEY", ""),
		},
		Redis: RedisConfig{
			Addr:     getEnv("REDIS_HOST", "redis") + ":" + getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       0,
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
