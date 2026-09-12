package telemetry

import (
	"context"

	"go.uber.org/zap"
)

type SecurityEventType string

const (
	EventAuthSuccess	SecurityEventType	= "AUTH_SUCCESS"
	EventAuthFailure	SecurityEventType	= "AUTH_FAILURE"
	EventOTPRequested	SecurityEventType	= "OTP_REQUESTED"
	EventOTPBlocked		SecurityEventType	= "OTP_BLOCKED"
	EventTokenRevoked	SecurityEventType	= "TOKEN_REVOKED"
	EventPermissionDenied	SecurityEventType	= "PERMISSION_DENIED"
)

type AuditLogger struct {
	logger *zap.Logger
}

func NewAuditLogger(logger *zap.Logger) *AuditLogger {
	return &AuditLogger{logger: logger}
}

func (a *AuditLogger) LogSecurityEvent(ctx context.Context, eventType SecurityEventType, userID, email, clientIP, userAgent string, metadata map[string]interface{}) {
	fields := []zap.Field{
		zap.String("event_type", string(eventType)),
		zap.String("user_id", userID),
		zap.String("email", email),
		zap.String("client_ip", clientIP),
		zap.String("user_agent", userAgent),
	}

	for k, v := range metadata {
		fields = append(fields, zap.Any("meta_"+k, v))
	}

	a.logger.Info("SECURITY_AUDIT_EVENT", fields...)
}
