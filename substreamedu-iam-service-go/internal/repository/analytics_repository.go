package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/substreamedu/substreamedu-iam-service/internal/model"
)

type AnalyticsRepository interface {
	RecordEvent(ctx context.Context, eventName string, userID, anonymousID *string, properties map[string]interface{}) error
	GetAnalyticsSummary(ctx context.Context) (*model.AnalyticsSummary, error)
}

type analyticsRepository struct {
	pool *pgxpool.Pool
}

func NewAnalyticsRepository(pool *pgxpool.Pool) AnalyticsRepository {
	return &analyticsRepository{pool: pool}
}

func (r *analyticsRepository) RecordEvent(ctx context.Context, eventName string, userID, anonymousID *string, properties map[string]interface{}) error {
	if properties == nil {
		properties = make(map[string]interface{})
	}
	propsJSON, err := json.Marshal(properties)
	if err != nil {
		propsJSON = []byte("{}")
	}

	const query = `
		INSERT INTO analytics_events (event_name, user_id, anonymous_id, properties)
		VALUES ($1, $2, $3, $4)`

	_, err = r.pool.Exec(ctx, query, eventName, userID, anonymousID, propsJSON)
	if err != nil {
		return fmt.Errorf("record analytics event: %w", err)
	}
	return nil
}

func (r *analyticsRepository) GetAnalyticsSummary(ctx context.Context) (*model.AnalyticsSummary, error) {
	summary := &model.AnalyticsSummary{
		RecentEvents: make([]model.AnalyticsEvent, 0),
	}

	// 1. Funnel stats queries
	// Total unique visitors (unique anonymous_id or user_id)
	const visitorQuery = `
		SELECT COUNT(DISTINCT COALESCE(user_id, anonymous_id))
		FROM analytics_events
		WHERE COALESCE(user_id, anonymous_id) IS NOT NULL`
	_ = r.pool.QueryRow(ctx, visitorQuery).Scan(&summary.Funnel.TotalVisitors)

	// Distinct users/guests who opened player
	const playerQuery = `
		SELECT COUNT(DISTINCT COALESCE(user_id, anonymous_id))
		FROM analytics_events
		WHERE event_name = 'open_player'`
	_ = r.pool.QueryRow(ctx, playerQuery).Scan(&summary.Funnel.PlayerOpened)

	// Distinct users/guests who selected >= 1 word
	const wordSelectQuery = `
		SELECT COUNT(DISTINCT COALESCE(user_id, anonymous_id))
		FROM analytics_events
		WHERE event_name = 'select_word'`
	_ = r.pool.QueryRow(ctx, wordSelectQuery).Scan(&summary.Funnel.WordSelected)

	// Distinct users who successfully saved >= 1 word
	const wordSaveQuery = `
		SELECT COUNT(DISTINCT COALESCE(user_id, anonymous_id))
		FROM analytics_events
		WHERE event_name = 'save_word' AND (properties->>'status' = 'success' OR properties->>'status' IS NULL)`
	_ = r.pool.QueryRow(ctx, wordSaveQuery).Scan(&summary.Funnel.WordSaved)

	// Guest save attempts blocked (leading to login prompt)
	const guestSaveQuery = `
		SELECT COUNT(*)
		FROM analytics_events
		WHERE event_name = 'save_word' AND properties->>'status' = 'guest_blocked'`
	_ = r.pool.QueryRow(ctx, guestSaveQuery).Scan(&summary.Funnel.GuestSavesAttempted)

	// Signups
	const signupQuery = `
		SELECT COUNT(*)
		FROM analytics_events
		WHERE event_name = 'signup'`
	_ = r.pool.QueryRow(ctx, signupQuery).Scan(&summary.Funnel.Signups)

	// Day 2 returns
	const returnD2Query = `
		SELECT COUNT(*)
		FROM analytics_events
		WHERE event_name = 'return_d2'`
	_ = r.pool.QueryRow(ctx, returnD2Query).Scan(&summary.Funnel.ReturnD2)

	// Calculate activation rate: WordSelected / TotalVisitors
	if summary.Funnel.TotalVisitors > 0 {
		summary.Funnel.ActivationRate = (float64(summary.Funnel.WordSelected) / float64(summary.Funnel.TotalVisitors)) * 100.0
	}

	// Calculate registered activation rate: WordSelected / Signups
	if summary.Funnel.Signups == 0 {
		var totalRegistered int64
		if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&totalRegistered); err == nil && totalRegistered > 0 {
			summary.Funnel.Signups = totalRegistered
		}
	}
	if summary.Funnel.Signups > 0 {
		summary.Funnel.RegisteredActivationRate = (float64(summary.Funnel.WordSelected) / float64(summary.Funnel.Signups)) * 100.0
	}

	// 2. Fetch last 50 recent events
	const recentQuery = `
		SELECT id, event_name, user_id, anonymous_id, properties, created_at
		FROM analytics_events
		ORDER BY created_at DESC
		LIMIT 50`

	rows, err := r.pool.Query(ctx, recentQuery)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var ev model.AnalyticsEvent
			var propsBytes []byte
			if err := rows.Scan(&ev.ID, &ev.EventName, &ev.UserID, &ev.AnonymousID, &propsBytes, &ev.CreatedAt); err == nil {
				if len(propsBytes) > 0 {
					_ = json.Unmarshal(propsBytes, &ev.Properties)
				}
				summary.RecentEvents = append(summary.RecentEvents, ev)
			}
		}
	}

	return summary, nil
}
