package cache

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

type ResponseCache struct {
	rdb *redis.Client
}

func NewResponseCache(rdb *redis.Client) *ResponseCache {
	return &ResponseCache{rdb: rdb}
}

func (c *ResponseCache) Get(ctx context.Context, key string) ([]byte, bool) {
	data, err := c.rdb.Get(ctx, "gateway:"+key).Bytes()
	if err != nil {
		return nil, false
	}
	return data, true
}

func (c *ResponseCache) Set(ctx context.Context, key string, data []byte, ttl time.Duration) {
	c.rdb.Set(ctx, "gateway:"+key, data, ttl)
}

func (c *ResponseCache) Key(method, path string) string {
	return method + ":" + path
}

func (c *ResponseCache) InvalidateUserCache(ctx context.Context, userID string) {
	if c.rdb == nil || userID == "" {
		return
	}
	pattern := "gateway:*:uid:" + userID
	iter := c.rdb.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		c.rdb.Del(ctx, iter.Val())
	}
}

func (c *ResponseCache) IsTokenBlacklisted(ctx context.Context, tokenIdentifier string) bool {
	if c.rdb == nil || tokenIdentifier == "" {
		return false
	}
	val, err := c.rdb.Get(ctx, "jwt:revoked:"+tokenIdentifier).Result()
	return err == nil && val != ""
}
