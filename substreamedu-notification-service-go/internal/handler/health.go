package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	poolTotalConns	= promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name:	"db_pool_total_conns",
		Help:	"Total number of connections in the pool",
	}, []string{"service"})

	poolIdleConns	= promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name:	"db_pool_idle_conns",
		Help:	"Number of idle connections in the pool",
	}, []string{"service"})

	poolAcquireCount	= promauto.NewCounterVec(prometheus.CounterOpts{
		Name:	"db_pool_acquire_total",
		Help:	"Total number of connections acquired",
	}, []string{"service"})
)

type HealthHandler struct {
	pool *pgxpool.Pool
}

func NewHealthHandler(pool *pgxpool.Pool) *HealthHandler {
	return &HealthHandler{pool: pool}
}

func (h *HealthHandler) RegisterPoolMetrics(serviceName string) {
	if h.pool == nil {
		return
	}
	stats := h.pool.Stat()
	poolTotalConns.WithLabelValues(serviceName).Set(float64(stats.TotalConns()))
	poolIdleConns.WithLabelValues(serviceName).Set(float64(stats.IdleConns()))
	poolAcquireCount.WithLabelValues(serviceName).Add(float64(stats.AcquireCount()))
}

func (h *HealthHandler) Health(c *gin.Context) {
	if h.pool != nil {
		if err := h.pool.Ping(c.Request.Context()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "DOWN", "reason": "database unreachable"})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"status": "UP"})
}

func (h *HealthHandler) Info(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"app": gin.H{
			"name":		"substreamedu-notification-service",
			"version":	"1.0.0",
			"description":	"Notification & Telegram Bot Service (Go)",
		},
	})
}

func (h *HealthHandler) Prometheus() gin.HandlerFunc {
	handler := promhttp.Handler()
	return func(c *gin.Context) {
		handler.ServeHTTP(c.Writer, c.Request)
	}
}
