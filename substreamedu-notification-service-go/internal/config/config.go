package config

import (
	"fmt"
	"os"
)

type Config struct {
	Server		ServerConfig
	Telegram	TelegramConfig
	Kafka		KafkaConfig
	Services	ServicesConfig
	Database	DatabaseConfig
	OTLPEndpoint	string
}

type ServerConfig struct {
	Port		string
	ContextPath	string
}

type TelegramConfig struct {
	Token		string
	Username	string
}

type KafkaConfig struct {
	Brokers	string
	GroupID	string
	Topic	string
}

type ServicesConfig struct {
	IAMURL		string
	DictionaryURL	string
}

type DatabaseConfig struct {
	Host		string
	Port		string
	Database	string
	User		string
	Password	string
}

func (c *DatabaseConfig) DSN() string {
	sslmode := os.Getenv("POSTGRES_SSLMODE")
	if sslmode == "" {
		sslmode = "disable"
	}
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.User, c.Password, c.Host, c.Port, c.Database, sslmode)
}

func Load() *Config {
	iamHost := getEnv("IAM_SERVICE_HOST", "localhost")
	dictHost := getEnv("DICTIONARY_SERVICE_HOST", "localhost")

	return &Config{
		OTLPEndpoint:	getEnv("OTLP_ENDPOINT", "jaeger:4317"),
		Server: ServerConfig{
			Port:		getEnv("SERVER_PORT", "3005"),
			ContextPath:	"/notification-service",
		},
		Telegram: TelegramConfig{
			Token:		getEnv("TELEGRAM_BOT_TOKEN", ""),
			Username:	getEnv("TELEGRAM_BOT_USERNAME", ""),
		},
		Kafka: KafkaConfig{
			Brokers:	getEnv("SPRING_KAFKA_BOOTSTRAP_SERVERS", "localhost:9094"),
			GroupID:	"notification-group",
			Topic:		getEnv("KAFKA_REVIEW_TOPIC", "word-reviewed-events"),
		},
		Services: ServicesConfig{
			IAMURL:		"http://" + iamHost + ":3002/auth-service",
			DictionaryURL:	"http://" + dictHost + ":3003/dictionary-service",
		},
		Database: DatabaseConfig{
			Host:		getEnv("POSTGRES_HOST", "localhost"),
			Port:		getEnv("POSTGRES_PORT", "5432"),
			Database:	getEnv("POSTGRES_DB_NOTIFICATION", "sse_iam"),
			User:		getEnv("POSTGRES_USER_APP", getEnv("POSTGRES_USER", "substream_app")),
			Password:	getEnv("POSTGRES_PASSWORD_APP", getEnv("POSTGRES_PASSWORD", "substream_pass")),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
