package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Claims struct {
	ID   string `json:"id"`
	Role string `json:"role"`
	jwt.RegisteredClaims
}

// AuthMiddleware enforces valid JWT token and extracts user identity.
func AuthMiddleware(secretKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || len(authHeader) < 7 {
			c.AbortWithStatusJSON(401, gin.H{"success": false, "message": "Unauthorized"})
			return
		}
		tokenString := authHeader[7:]
		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secretKey), nil
		})
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"success": false, "message": "Invalid token"})
			return
		}
		claims, ok := token.Claims.(*Claims)
		if !ok || !token.Valid {
			c.AbortWithStatusJSON(401, gin.H{"success": false, "message": "Invalid token"})
			return
		}

		uid, err := uuid.Parse(claims.ID)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"success": false, "message": "Invalid user ID in token"})
			return
		}

		c.Set("userID", uid)
		c.Set("userRole", claims.Role)
		c.Next()
	}
}

// OptionalAuthMiddleware extracts user identity if valid token is provided.
func OptionalAuthMiddleware(secretKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" && len(authHeader) >= 7 {
			tokenString := authHeader[7:]
			token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(secretKey), nil
			})
			if err == nil {
				if claims, ok := token.Claims.(*Claims); ok && token.Valid {
					if uid, err := uuid.Parse(claims.ID); err == nil {
						c.Set("userID", uid)
						c.Set("userRole", claims.Role)
					}
				}
			}
		}
		c.Next()
	}
}
