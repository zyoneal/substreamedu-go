// Package config provides application configuration management.
package config

import (
	"fmt"
	"os"
)

// Config holds all application configuration.
type Config struct {
	Server   ServerConfig
	Telegram TelegramConfig
	Kafka    KafkaConfig
	Services ServicesConfig
	Database DatabaseConfig
}

// ServerConfig holds HTTP server configuration.
type ServerConfig struct {
	Port        string
	ContextPath string
}

// TelegramConfig holds Telegram bot configuration.
type TelegramConfig struct {
	Token    string
	Username string
}

// KafkaConfig holds Kafka configuration.
type KafkaConfig struct {
	Brokers string
	GroupID string
	Topic   string
}

// ServicesConfig holds external services URLs.
type ServicesConfig struct {
	IAMURL        string
	DictionaryURL string
}

// DatabaseConfig holds PostgreSQL configuration.
type DatabaseConfig struct {
	Host     string
	Port     string
	Database string
	User     string
	Password string
}

// DSN returns the PostgreSQL connection string.
func (c *DatabaseConfig) DSN() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		c.Host, c.Port, c.User, c.Password, c.Database)
}

// Load loads configuration from environment variables.
func Load() *Config {
	iamHost := getEnv("IAM_SERVICE_HOST", "localhost")
	dictHost := getEnv("DICTIONARY_SERVICE_HOST", "localhost")

	return &Config{
		Server: ServerConfig{
			Port:        getEnv("SERVER_PORT", "3005"),
			ContextPath: "/notification-service",
		},
		Telegram: TelegramConfig{
			Token:    getEnv("TELEGRAM_BOT_TOKEN", ""),
			Username: getEnv("TELEGRAM_BOT_USERNAME", ""),
		},
		Kafka: KafkaConfig{
			Brokers: getEnv("SPRING_KAFKA_BOOTSTRAP_SERVERS", "localhost:9094"),
			GroupID: "notification-group",
			Topic:   getEnv("KAFKA_REVIEW_TOPIC", "word-reviewed-events"),
		},
		Services: ServicesConfig{
			IAMURL:        "http://" + iamHost + ":3002/auth-service",
			DictionaryURL: "http://" + dictHost + ":3003/dictionary-service",
		},
		Database: DatabaseConfig{
			Host:     getEnv("POSTGRES_HOST", "localhost"),
			Port:     getEnv("POSTGRES_PORT", "5432"),
			Database: getEnv("POSTGRES_DB_NOTIFICATION", "sse_iam"),
			User:     getEnv("POSTGRES_USER_APP", "substream_app"),
			Password: getEnv("POSTGRES_PASSWORD_APP", "substream_pass"),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
