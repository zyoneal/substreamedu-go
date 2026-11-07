package config

import (
	"os"
	"strings"
)

type RouteConfig struct {
	ID		string
	Path		[]string
	ProxyTarget	string
	StripPrefix	int
	PrefixPath	string
}

type CORSConfig struct {
	AllowedOrigins []string
}

type Config struct {
	ServerPort	string
	OTLPEndpoint	string
	RedisHost	string
	RedisPassword	string
	Routes		[]RouteConfig
	CORS		CORSConfig
}

func Load() *Config {
	return &Config{
		ServerPort:	getEnv("SERVER_PORT", "8080"),
		OTLPEndpoint:	getEnv("OTLP_ENDPOINT", "jaeger:4317"),
		RedisHost:	getEnv("REDIS_HOST", "localhost"),
		RedisPassword:	getEnv("REDIS_PASSWORD", ""),
		CORS: CORSConfig{
			AllowedOrigins: parseAllowedOrigins(getEnv("ALLOWED_ORIGINS", "")),
		},
		Routes: []RouteConfig{
			{
				ID:		"iam-auth-new",
				Path:		[]string{"/api/auth", "/api/auth/**"},
				ProxyTarget:	getEnv("IAM_SERVICE_HOST", "http://iam-service:3002"),
				StripPrefix:	1,
				PrefixPath:	"/auth-service",
			},
			{
				ID:		"iam-users-new",
				Path:		[]string{"/api/users", "/api/users/**"},
				ProxyTarget:	getEnv("IAM_SERVICE_HOST", "http://iam-service:3002"),
				StripPrefix:	1,
				PrefixPath:	"/auth-service",
			},
			{
				ID:		"iam-admin",
				Path:		[]string{"/api/admin", "/api/admin/**"},
				ProxyTarget:	getEnv("IAM_SERVICE_HOST", "http://iam-service:3002"),
				StripPrefix:	1,
				PrefixPath:	"/auth-service",
			},
			{
				ID:		"iam-legacy",
				Path:		[]string{"/auth", "/auth/**", "/users", "/users/**"},
				ProxyTarget:	getEnv("IAM_SERVICE_HOST", "http://iam-service:3002"),
				StripPrefix:	0,
				PrefixPath:	"/auth-service",
			},
			{
				ID:		"dictionary-service",
				Path:		[]string{"/api/dictionary", "/api/dictionary/**", "/api/subtitles/generate-text"},
				ProxyTarget:	getEnv("DICTIONARY_SERVICE_HOST", "http://dictionary-service:3003"),
				StripPrefix:	1,
				PrefixPath:	"/dictionary-service",
			},
			{
				ID:		"media-service",
				Path:		[]string{"/api/subtitles", "/api/subtitles/**", "/api/lyrics", "/api/lyrics/**", "/api/youtube", "/api/youtube/**"},
				ProxyTarget:	getEnv("MEDIA_SERVICE_HOST", "http://media-service:3004"),
				StripPrefix:	1,
				PrefixPath:	"/media-service",
			},
			{
				ID:		"notification-service",
				Path:		[]string{"/api/notifications/**"},
				ProxyTarget:	getEnv("NOTIFICATION_SERVICE_HOST", "http://notification-service:3005"),
				StripPrefix:	1,
				PrefixPath:	"/notification-service",
			},
		},
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func parseAllowedOrigins(raw string) []string {
	if raw == "" {
		return nil
	}
	var origins []string
	for _, o := range strings.Split(raw, ",") {
		trimmed := strings.TrimSpace(o)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}
