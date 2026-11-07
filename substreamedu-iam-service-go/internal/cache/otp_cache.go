package cache

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

type OTPItem struct {
	Code      string    `json:"code"`
	Attempts  int       `json:"attempts"`
	CreatedAt time.Time `json:"created_at"`
	Blocked   bool      `json:"blocked"`
}

type OTPCache struct {
	rc *redis.Client
}

func NewOTPCache(redisClient *redis.Client) *OTPCache {
	return &OTPCache{
		rc: redisClient,
	}
}

func (c *OTPCache) Set(email, otp string) {
	item := &OTPItem{Code: otp, Attempts: 0, CreatedAt: time.Now(), Blocked: false}
	data, _ := json.Marshal(item)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// Store the OTP payload
	c.rc.Set(ctx, "otp:"+email, data, 5*time.Minute)
	// Reset any attempts tracking
	c.rc.Del(ctx, "otp_meta:"+email)
}

func (c *OTPCache) Get(email string) *OTPItem {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	data, err := c.rc.Get(ctx, "otp:"+email).Bytes()
	if err != nil {
		return nil
	}

	var item OTPItem
	if err := json.Unmarshal(data, &item); err != nil {
		return nil
	}
	return &item
}

func (c *OTPCache) Delete(email string) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	c.rc.Del(ctx, "otp:"+email, "otp_meta:"+email)
}

func (c *OTPCache) IncrementAttempts(email string) int {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	val, err := c.rc.HIncrBy(ctx, "otp_meta:"+email, "attempts", 1).Result()
	if err != nil {
		return 0
	}
	// Expire the attempts tracking after 5 minutes too
	c.rc.Expire(ctx, "otp_meta:"+email, 5*time.Minute)
	return int(val)
}
