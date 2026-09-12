package service

import (
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/substreamedu/substreamedu-iam-service/internal/config"
	"github.com/substreamedu/substreamedu-iam-service/internal/model"
)

type JWTService struct {
	secretKey	[]byte
	rsaKeyManager	*RSAKeyManager
	expiration	time.Duration
}

func NewJWTService(cfg *config.JWTConfig) *JWTService {
	rsaMgr, _ := NewRSAKeyManager()
	return &JWTService{
		secretKey:	[]byte(cfg.SecretKey),
		rsaKeyManager:	rsaMgr,
		expiration:	cfg.Expiration,
	}
}

type Claims struct {
	ID			string	`json:"id"`
	Role			string	`json:"role"`
	IsPremium		bool	`json:"isPremium"`
	TranslationCount	int	`json:"translationCount"`
	SavedWordsCount		int	`json:"savedWordsCount"`
	jwt.RegisteredClaims
}

func (s *JWTService) GetRSAKeyManager() *RSAKeyManager {
	return s.rsaKeyManager
}

func (s *JWTService) GenerateToken(user *model.User) (string, error) {
	now := time.Now()
	claims := &Claims{
		ID:			user.ID.String(),
		Role:			user.Role,
		IsPremium:		user.IsPremium,
		TranslationCount:	user.TranslationCount,
		SavedWordsCount:	user.SavedWordsCount,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:	user.Email,
			IssuedAt:	jwt.NewNumericDate(now),
			ExpiresAt:	jwt.NewNumericDate(now.Add(s.expiration)),
		},
	}

	if s.rsaKeyManager != nil && s.rsaKeyManager.PrivateKey != nil {
		token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
		token.Header["kid"] = s.rsaKeyManager.KeyID
		return token.SignedString(s.rsaKeyManager.PrivateKey)
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secretKey)
}

func (s *JWTService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		switch token.Method.(type) {
		case *jwt.SigningMethodRSA:
			if s.rsaKeyManager != nil && s.rsaKeyManager.PublicKey != nil {
				return s.rsaKeyManager.PublicKey, nil
			}
			return nil, fmt.Errorf("RSA public key unavailable")
		case *jwt.SigningMethodHMAC:
			return s.secretKey, nil
		default:
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}

func (s *JWTService) IsDevMode() bool {
	secretStr := string(s.secretKey)
	return strings.HasPrefix(secretStr, "dev-") || secretStr == ""
}
