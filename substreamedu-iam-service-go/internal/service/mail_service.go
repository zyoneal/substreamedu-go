package service

import (
	"crypto/rand"
	"crypto/tls"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/substreamedu/substreamedu-iam-service/internal/config"
	"go.uber.org/zap"
	"gopkg.in/gomail.v2"
)

type MailService struct {
	dialer *gomail.Dialer
	from   string
	logger *zap.Logger
}

func NewMailService(cfg *config.MailConfig, logger *zap.Logger) *MailService {
	dialer := gomail.NewDialer(cfg.Host, cfg.Port, cfg.Username, cfg.Password)
	dialer.TLSConfig = &tls.Config{
		InsecureSkipVerify: false,
		ServerName:         cfg.Host,
	}

	return &MailService{
		dialer: dialer,
		from:   cfg.Username,
		logger: logger,
	}
}

func (s *MailService) SendOTPEmail(email, otp string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", s.from)
	m.SetHeader("To", email)
	m.SetHeader("Subject", "Your access code")
	m.SetBody("text/html", buildEmailBody(otp))

	maxAttempts := 3
	var lastErr error

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		done := make(chan error, 1)
		go func() {
			done <- s.dialer.DialAndSend(m)
		}()

		var err error
		select {
		case err = <-done:
		case <-time.After(5 * time.Second):
			err = errors.New("smtp connection timed out after 5s")
		}

		if err == nil {
			s.logger.Info("Access code sent",
				zap.String("email", email),
				zap.Int("attempt", attempt),
			)
			return nil
		}

		lastErr = err
		if attempt < maxAttempts {
			// Exponential backoff with full jitter: rand(0, 2^(attempt-1) * 500ms)
			baseDelay := time.Duration(1<<(attempt-1)) * 500 * time.Millisecond
			maxMillis := int64(baseDelay / time.Millisecond)
			sleep := time.Duration(maxMillis/2) * time.Millisecond
			if maxMillis > 0 {
				if n, rErr := rand.Int(rand.Reader, big.NewInt(maxMillis+1)); rErr == nil {
					sleep = time.Duration(n.Int64()) * time.Millisecond
				}
			}

			s.logger.Warn("Failed to send OTP email, retrying with jitter",
				zap.String("email", email),
				zap.Int("attempt", attempt),
				zap.Duration("sleep", sleep),
				zap.Error(err),
			)
			time.Sleep(sleep)
		}
	}

	s.logger.Error("Failed to send OTP email after retries",
		zap.String("email", email),
		zap.Int("attempts", maxAttempts),
		zap.Error(lastErr),
	)
	return fmt.Errorf("send email after %d attempts: %w", maxAttempts, lastErr)
}

func buildEmailBody(otp string) string {
	return fmt.Sprintf(`
		<html>
			<body>
				<h2>Your access code:</h2>
				<p>Your code: <strong>%s</strong></p>
			</body>
		</html>
	`, otp)
}
