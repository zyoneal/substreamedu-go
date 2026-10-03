// Package service provides business logic layer.
package service

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/substreamedu/wordstream-iam-service/internal/config"
	"github.com/substreamedu/wordstream-iam-service/internal/model"
)

// JWTService handles JWT token generation and validation.
type JWTService struct {
	secretKey  []byte
	expiration time.Duration
}

// NewJWTService creates a new JWTService.
func NewJWTService(cfg *config.JWTConfig) *JWTService {
	return &JWTService{
		secretKey:  []byte(cfg.SecretKey),
		expiration: cfg.Expiration,
	}
}

// Claims represents JWT token claims.
type Claims struct {
	ID   string `json:"id"`
	Role string `json:"role"`
	jwt.RegisteredClaims
}

// GenerateToken creates a new JWT token for the given user.
// Token includes user ID in claims and email as subject.
// Uses HS256 algorithm matching Java implementation.
func (s *JWTService) GenerateToken(user *model.User) (string, error) {
	now := time.Now()
	claims := &Claims{
		ID:   user.ID.String(),
		Role: user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.Email,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.expiration)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secretKey)
}

// ValidateToken validates a JWT token and returns the claims.
func (s *JWTService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return s.secretKey, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}
