package config

import (
	"fmt"
	"os"
)

type JWTConfig struct {
	SecretKey string
}

type Config struct {
	Server		ServerConfig
	Database	DatabaseConfig
	JWT		JWTConfig
	Kafka		KafkaConfig
	Redis		RedisConfig
	DeepSeek	DeepSeekConfig
	Groq		GroqConfig
	Gemini		GeminiConfig
	NounProject	NounProjectConfig
	Pixabay		PixabayConfig
	IAMServiceURL	string
	OTLPEndpoint	string
}

type NounProjectConfig struct {
	APIKey		string
	APISecret	string
}

type PixabayConfig struct {
	APIKey string
}

type GeminiConfig struct {
	APIKey string
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

type KafkaConfig struct {
	BootstrapServers	string
	GroupID			string
	ReviewTopic		string
}

type RedisConfig struct {
	Addr		string
	Password	string
	DB		int
}

type DeepSeekConfig struct {
	APIKey string
}

type GroqConfig struct {
	APIKey string
}

func Load() *Config {
	redisHost := getEnv("REDIS_HOST", "redis")
	redisPort := getEnv("REDIS_PORT", "6379")
	redisAddr := redisHost + ":" + redisPort

	return &Config{
		Server: ServerConfig{
			Port:		getEnv("SERVER_PORT", "3003"),
			ContextPath:	"/dictionary-service",
		},
		JWT: JWTConfig{
			SecretKey: getEnv("SECRET_KEY", ""),
		},
		Database: DatabaseConfig{
			Host:		getEnv("POSTGRES_HOST", "localhost"),
			Port:		getEnv("POSTGRES_PORT", "5432"),
			User:		getEnv("POSTGRES_USER_APP", getEnv("POSTGRES_USER", "substream_app")),
			Password:	getEnv("POSTGRES_PASSWORD_APP", getEnv("POSTGRES_PASSWORD", "substream_pass")),
			Database:	getEnv("POSTGRES_DB_DICTIONARY", "substreamedu_dictionary"),
		},
		Kafka: KafkaConfig{
			BootstrapServers:	getEnv("SPRING_KAFKA_BOOTSTRAP_SERVERS", "localhost:9094"),
			GroupID:		getEnv("KAFKA_GROUP_ID", "dictionary-group"),
			ReviewTopic:		getEnv("KAFKA_REVIEW_TOPIC", "word-reviewed-events"),
		},
		Redis: RedisConfig{
			Addr:		redisAddr,
			Password:	getEnv("REDIS_PASSWORD", ""),
			DB:		0,
		},
		DeepSeek: DeepSeekConfig{
			APIKey: getEnv("DEEPSEEK_API_KEY", ""),
		},
		Groq: GroqConfig{
			APIKey: getEnv("GROQ_API_KEY", ""),
		},
		Gemini: GeminiConfig{
			APIKey: getEnv("GEMINI_API_KEY", ""),
		},
		NounProject: NounProjectConfig{
			APIKey:		getEnv("NOUN_PROJECT_API_KEY", ""),
			APISecret:	getEnv("NOUN_PROJECT_API_SECRET", ""),
		},
		Pixabay: PixabayConfig{
			APIKey: getEnv("PIXABAY_API_KEY", ""),
		},
		IAMServiceURL:	getEnv("IAM_SERVICE_URL", "http://iam-service:3002"),
		OTLPEndpoint:	getEnv("OTLP_ENDPOINT", "jaeger:4317"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
