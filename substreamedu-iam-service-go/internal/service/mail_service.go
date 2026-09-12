package service

import (
	"crypto/tls"
	"fmt"

	"github.com/substreamedu/substreamedu-iam-service/internal/config"
	"go.uber.org/zap"
	"gopkg.in/gomail.v2"
)

type MailService struct {
	dialer	*gomail.Dialer
	from	string
	logger	*zap.Logger
}

func NewMailService(cfg *config.MailConfig, logger *zap.Logger) *MailService {
	dialer := gomail.NewDialer(cfg.Host, cfg.Port, cfg.Username, cfg.Password)
	dialer.TLSConfig = &tls.Config{
		InsecureSkipVerify:	false,
		ServerName:		cfg.Host,
	}

	return &MailService{
		dialer:	dialer,
		from:	cfg.Username,
		logger:	logger,
	}
}

func (s *MailService) SendOTPEmail(email, otp string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", s.from)
	m.SetHeader("To", email)
	m.SetHeader("Subject", "Your access code")
	m.SetBody("text/html", buildEmailBody(otp))

	if err := s.dialer.DialAndSend(m); err != nil {
		s.logger.Error("Failed to send OTP email",
			zap.String("email", email),
			zap.Error(err),
		)
		return fmt.Errorf("send email: %w", err)
	}

	s.logger.Info("Access code sent",
		zap.String("email", email),
	)

	return nil
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
