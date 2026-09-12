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

type HealthResponse struct {
	Status string `json:"status"`
}

func (h *HealthHandler) Health(c *gin.Context) {
	if h.pool != nil {
		if err := h.pool.Ping(c.Request.Context()); err != nil {
			c.JSON(http.StatusServiceUnavailable, HealthResponse{Status: "DOWN"})
			return
		}
	}
	c.JSON(http.StatusOK, HealthResponse{Status: "UP"})
}

func (h *HealthHandler) Info(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"app": gin.H{
			"name":		"substreamedu-iam-service",
			"version":	"1.0.0",
			"description":	"Identity and Access Management Service for SubStreamEdu (Go)",
		},
	})
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

func (h *HealthHandler) Metrics(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"names": []string{"http.server.requests", "jvm.memory.used"},
	})
}

func (h *HealthHandler) Prometheus() gin.HandlerFunc {
	handler := promhttp.Handler()
	return func(c *gin.Context) {
		handler.ServeHTTP(c.Writer, c.Request)
	}
}
