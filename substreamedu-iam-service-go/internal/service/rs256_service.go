package service

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"os"
)

type RSAKeyManager struct {
	PrivateKey	*rsa.PrivateKey
	PublicKey	*rsa.PublicKey
	KeyID		string
}

func NewRSAKeyManager() (*RSAKeyManager, error) {
	keyID := os.Getenv("RSA_KEY_ID")
	if keyID == "" {
		keyID = "substreamedu-iam-rs256-v1"
	}

	privPEM := os.Getenv("RSA_PRIVATE_KEY_PEM")
	if privPEM != "" {
		block, _ := pem.Decode([]byte(privPEM))
		if block == nil {
			return nil, fmt.Errorf("failed to parse RSA_PRIVATE_KEY_PEM block")
		}
		privKey, err := x509.ParsePKCS1PrivateKey(block.Bytes)
		if err != nil {

			pkcs8Key, err2 := x509.ParsePKCS8PrivateKey(block.Bytes)
			if err2 != nil {
				return nil, fmt.Errorf("failed to parse RSA private key (PKCS1: %v, PKCS8: %v)", err, err2)
			}
			rsaPriv, ok := pkcs8Key.(*rsa.PrivateKey)
			if !ok {
				return nil, fmt.Errorf("key in RSA_PRIVATE_KEY_PEM is not an RSA private key")
			}
			privKey = rsaPriv
		}
		return &RSAKeyManager{
			PrivateKey:	privKey,
			PublicKey:	&privKey.PublicKey,
			KeyID:		keyID,
		}, nil
	}

	return nil, nil
}

func generateRSAKeyPair() (*rsa.PrivateKey, error) {
	return rsa.GenerateKey(rand.Reader, 2048)
}

type JWKItem struct {
	Kty	string	`json:"kty"`
	Use	string	`json:"use"`
	Alg	string	`json:"alg"`
	Kid	string	`json:"kid"`
	N	string	`json:"n"`
	E	string	`json:"e"`
}

type JWKSResponse struct {
	Keys []JWKItem `json:"keys"`
}

func (m *RSAKeyManager) GetJWKS() JWKSResponse {
	nBytes := m.PublicKey.N.Bytes()
	eBytes := bigEndianIntBytes(m.PublicKey.E)

	return JWKSResponse{
		Keys: []JWKItem{
			{
				Kty:	"RSA",
				Use:	"sig",
				Alg:	"RS256",
				Kid:	m.KeyID,
				N:	base64.RawURLEncoding.EncodeToString(nBytes),
				E:	base64.RawURLEncoding.EncodeToString(eBytes),
			},
		},
	}
}

func bigEndianIntBytes(e int) []byte {
	if e == 0 {
		return []byte{0}
	}
	var res []byte
	for e > 0 {
		res = append([]byte{byte(e & 0xff)}, res...)
		e >>= 8
	}
	return res
}
