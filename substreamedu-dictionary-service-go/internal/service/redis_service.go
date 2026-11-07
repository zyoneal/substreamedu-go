package service

import (
	"time"

	"github.com/redis/go-redis/v9"
)

func NewRedisClient(addr, password string, db int) *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr:		addr,
		Password:	password,
		DB:		db,
		DialTimeout:	1000 * time.Millisecond,
		ReadTimeout:	1000 * time.Millisecond,
		WriteTimeout:	1000 * time.Millisecond,
		PoolSize:	100,
		MinIdleConns:	10,
	})
}
