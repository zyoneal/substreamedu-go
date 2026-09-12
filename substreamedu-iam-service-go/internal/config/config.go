package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Server		ServerConfig
	Database	DatabaseConfig
	JWT		JWTConfig
	Google		GoogleConfig
	Mail		MailConfig
	Redis		RedisConfig
	otlpEndpoint	string
}

type ServerConfig struct {
	Port		string
	ContextPath	string
}

type DatabaseConfig struct {
	Host		string
	Port		string
	Database	string
	User		string
	Password	string
}

type JWTConfig struct {
	SecretKey	string
	Expiration	time.Duration
}

type GoogleConfig struct {
	ClientID	string
	ClientSecret	string
}

type MailConfig struct {
	Host		string
	Port		int
	Username	string
	Password	string
}

type RedisConfig struct {
	Host	string
	Port	string
}

func Load() (*Config, error) {
	mailPort, _ := strconv.Atoi(getEnv("SPRING_MAIL_PORT", "587"))
	jwtExpMs, _ := strconv.ParseInt(getEnv("JWT_EXPIRATION_MS", "2592000000"), 10, 64) // Default: 30 days (30 * 24 * 3600 * 1000 ms)

	cfg := &Config{
		Server: ServerConfig{
			Port:		getEnv("SERVER_PORT", "3002"),
			ContextPath:	"/auth-service",
		},
		Database: DatabaseConfig{
			Host:		getEnv("POSTGRES_HOST", "localhost"),
			Port:		getEnv("POSTGRES_PORT", "5432"),
			Database:	getEnv("POSTGRES_DB_IAM", "sse_iam"),
			User:		getEnv("POSTGRES_USER_APP", getEnv("POSTGRES_USER", "substream_app")),
			Password:	getEnv("POSTGRES_PASSWORD_APP", getEnv("POSTGRES_PASSWORD", "substream_pass")),
		},
		JWT: JWTConfig{
			SecretKey:	getEnv("SECRET_KEY", ""),
			Expiration:	time.Duration(jwtExpMs) * time.Millisecond,
		},
		Google: GoogleConfig{
			ClientID:	getEnv("GOOGLE_OAUTH_CLIENT_ID", ""),
			ClientSecret:	getEnv("GOOGLE_OAUTH_CLIENT_SECRET", ""),
		},
		Mail: MailConfig{
			Host:		getEnv("SPRING_MAIL_HOST", "smtp.gmail.com"),
			Port:		mailPort,
			Username:	getEnv("SPRING_MAIL_USERNAME", ""),
			Password:	getEnv("SPRING_MAIL_PASSWORD", ""),
		},
		Redis: RedisConfig{
			Host:	getEnv("REDIS_HOST", "localhost"),
			Port:	getEnv("REDIS_PORT", "6379"),
		},
	}

	cfg.otlpEndpoint = getEnv("OTLP_ENDPOINT", "jaeger:4317")

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) Validate() error {
	if c.JWT.SecretKey == "" {
		return fmt.Errorf("SECRET_KEY is required")
	}
	if len(c.JWT.SecretKey) < 32 {
		return fmt.Errorf("SECRET_KEY must be at least 32 characters")
	}
	if c.Database.User == "" || c.Database.Password == "" {
		return fmt.Errorf("POSTGRES_USER_APP and POSTGRES_PASSWORD_APP are required")
	}
	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func (c *Config) OTLPEndpoint() string	{ return c.otlpEndpoint }

func (d *DatabaseConfig) DSN() string {
	sslmode := getEnv("POSTGRES_SSLMODE", "disable")
	return "postgres://" + d.User + ":" + d.Password +
		"@" + d.Host + ":" + d.Port + "/" + d.Database + "?sslmode=" + sslmode
}
