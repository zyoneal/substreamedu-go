package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsSafePublicImageURL(t *testing.T) {
	tests := []struct {
		name     string
		url      string
		expected bool
	}{
		{
			name:     "Valid public HTTPS image URL",
			url:      "https://images.unsplash.com/photo-12345.jpg",
			expected: true,
		},
		{
			name:     "Valid public HTTP image URL",
			url:      "http://example.com/image.png",
			expected: true,
		},
		{
			name:     "Reject empty URL",
			url:      "",
			expected: false,
		},
		{
			name:     "Reject non-HTTP scheme",
			url:      "file:///etc/passwd",
			expected: false,
		},
		{
			name:     "Reject ftp scheme",
			url:      "ftp://example.com/pic.jpg",
			expected: false,
		},
		{
			name:     "Reject localhost",
			url:      "http://localhost:8080/secret",
			expected: false,
		},
		{
			name:     "Reject IPv4 loopback 127.0.0.1",
			url:      "http://127.0.0.1:3002/auth/internal/usage",
			expected: false,
		},
		{
			name:     "Reject private IP 10.0.0.1",
			url:      "http://10.0.0.1/admin",
			expected: false,
		},
		{
			name:     "Reject private IP 172.20.0.5",
			url:      "http://172.20.0.5:5432",
			expected: false,
		},
		{
			name:     "Reject private IP 192.168.1.1",
			url:      "http://192.168.1.1/router",
			expected: false,
		},
		{
			name:     "Reject cloud metadata 169.254.169.254",
			url:      "http://169.254.169.254/latest/meta-data/",
			expected: false,
		},
		{
			name:     "Reject internal docker container iam-service",
			url:      "http://iam-service:3002/auth/internal/token",
			expected: false,
		},
		{
			name:     "Reject internal docker container postgres",
			url:      "http://postgres:5432/db",
			expected: false,
		},
		{
			name:     "Reject internal docker container redis",
			url:      "http://redis:6379/keys",
			expected: false,
		},
		{
			name:     "Reject internal docker container gateway",
			url:      "http://gateway:8080/api",
			expected: false,
		},
		{
			name:     "Reject IPv6 loopback",
			url:      "http://[::1]:8080/secret",
			expected: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := IsSafePublicImageURL(tc.url)
			assert.Equal(t, tc.expected, result, "URL: %s", tc.url)
		})
	}
}
