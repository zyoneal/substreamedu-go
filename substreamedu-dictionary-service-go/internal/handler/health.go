package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/redis/go-redis/v9"
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

	redisTotalConns	= promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name:	"redis_pool_total_conns",
		Help:	"Total connections in Redis pool",
	}, []string{"service"})
)

type HealthHandler struct {
	db	*pgxpool.Pool
	rdb	*redis.Client
}

func NewHealthHandler(db *pgxpool.Pool, rdb *redis.Client) *HealthHandler {
	return &HealthHandler{db: db, rdb: rdb}
}

func (h *HealthHandler) RegisterPoolMetrics(serviceName string) {
	if h.db == nil {
		return
	}
	stats := h.db.Stat()
	poolTotalConns.WithLabelValues(serviceName).Set(float64(stats.TotalConns()))
	poolIdleConns.WithLabelValues(serviceName).Set(float64(stats.IdleConns()))
	poolAcquireCount.WithLabelValues(serviceName).Add(float64(stats.AcquireCount()))
}

func (h *HealthHandler) RegisterRedisMetrics(serviceName string) {
	if h.rdb == nil {
		return
	}
	poolStats := h.rdb.PoolStats()
	redisTotalConns.WithLabelValues(serviceName).Set(float64(poolStats.TotalConns))
}

func (h *HealthHandler) Liveness(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "UP"})
}

func (h *HealthHandler) Readiness(c *gin.Context) {
	ctx := c.Request.Context()
	if h.db != nil {
		if err := h.db.Ping(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "DOWN", "reason": "database unreachable", "error": err.Error()})
			return
		}
	}
	if h.rdb != nil {
		if err := h.rdb.Ping(ctx).Err(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "DOWN", "reason": "redis unreachable", "error": err.Error()})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"status": "UP"})
}

func (h *HealthHandler) Info(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"app": gin.H{
			"name":		"substreamedu-dictionary-service",
			"version":	"1.0.0",
		},
	})
}
