package config

import (
	"fmt"
	"os"
)

type Config struct {
	Server		ServerConfig
	Database	DatabaseConfig
	YouTube		YouTubeConfig
	Spotify		SpotifyConfig
	SubDL		SubDLConfig
	DeepSeek	DeepSeekConfig
	Redis		RedisConfig
	JWTSecret	string
	OTLPEndpoint	string
}

type ServerConfig struct {
	Port		string
	ContextPath	string
}

type DatabaseConfig struct {
	Host		string
	Port		string
	User		string
	Password	string
	Database	string
}

func (c DatabaseConfig) DSN() string {
	sslmode := getEnv("POSTGRES_SSLMODE", "disable")
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.User, c.Password, c.Host, c.Port, c.Database, sslmode)
}

type YouTubeConfig struct {
	APIKey string
}

type SpotifyConfig struct {
	ClientID	string
	ClientSecret	string
}

type SubDLConfig struct {
	APIKey	string
	BaseURL	string
}

type DeepSeekConfig struct {
	APIKey string
}

type RedisConfig struct {
	Addr		string
	Password	string
	DB		int
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port:		getEnv("SERVER_PORT", "3004"),
			ContextPath:	"/media-service",
		},
		Database: DatabaseConfig{
			Host:		getEnv("POSTGRES_HOST", "localhost"),
			Port:		getEnv("POSTGRES_PORT", "5432"),
			User:		getEnv("POSTGRES_USER_APP", getEnv("POSTGRES_USER", "substream_app")),
			Password:	getEnv("POSTGRES_PASSWORD_APP", getEnv("POSTGRES_PASSWORD", "substream_pass")),
			Database:	getEnv("POSTGRES_DB_MEDIA", "substreamedu_media"),
		},
		YouTube: YouTubeConfig{
			APIKey: getEnv("YOUTUBE_API_KEY", ""),
		},
		Spotify: SpotifyConfig{
			ClientID:	getEnv("SPOTIFY_CLIENT_ID", ""),
			ClientSecret:	getEnv("SPOTIFY_CLIENT_SECRET", ""),
		},
		SubDL: SubDLConfig{
			APIKey:		getEnv("SUBDL_API_KEY", ""),
			BaseURL:	getEnv("SUBDL_BASE_URL", "https://api.subdl.com/api/v1"),
		},
		DeepSeek: DeepSeekConfig{
			APIKey: getEnv("DEEPSEEK_API_KEY", ""),
		},
		Redis: RedisConfig{
			Addr:		getEnv("REDIS_HOST", "redis") + ":" + getEnv("REDIS_PORT", "6379"),
			Password:	getEnv("REDIS_PASSWORD", ""),
			DB:		0,
		},
		JWTSecret:	getEnv("SECRET_KEY", ""),
		OTLPEndpoint:	getEnv("OTLP_ENDPOINT", "jaeger:4317"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
