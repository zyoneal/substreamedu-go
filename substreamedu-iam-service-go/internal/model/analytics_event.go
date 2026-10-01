package model

import (
	"time"
)

type AnalyticsEvent struct {
	ID          int64                  `json:"id" db:"id"`
	EventName   string                 `json:"eventName" db:"event_name"`
	UserID      *string                `json:"userId,omitempty" db:"user_id"`
	AnonymousID *string                `json:"anonymousId,omitempty" db:"anonymous_id"`
	Properties  map[string]interface{} `json:"properties" db:"properties"`
	CreatedAt   time.Time              `json:"createdAt" db:"created_at"`
}

type FunnelStats struct {
	TotalVisitors            int64   `json:"totalVisitors"`
	PlayerOpened             int64   `json:"playerOpened"`
	WordSelected             int64   `json:"wordSelected"`
	WordSaved                int64   `json:"wordSaved"`
	GuestSavesAttempted      int64   `json:"guestSavesAttempted"`
	Signups                  int64   `json:"signups"`
	ReturnD2                 int64   `json:"returnD2"`
	ActivationRate           float64 `json:"activationRate"`
	RegisteredActivationRate float64 `json:"registeredActivationRate"`
}

type AnalyticsSummary struct {
	Funnel       FunnelStats      `json:"funnel"`
	RecentEvents []AnalyticsEvent `json:"recentEvents"`
}
