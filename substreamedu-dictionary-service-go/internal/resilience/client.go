package resilience

import (
	"net"
	"net/http"
	"time"
)

// ClientOptions configures resilient HTTP transport limits.
type ClientOptions struct {
	Timeout               time.Duration
	DialTimeout           time.Duration
	KeepAlive             time.Duration
	MaxIdleConns          int
	MaxIdleConnsPerHost   int
	IdleConnTimeout       time.Duration
	ResponseHeaderTimeout time.Duration
	TLSHandshakeTimeout   time.Duration
}

// DefaultClientOptions provides production socket pooling defaults.
func DefaultClientOptions(timeout time.Duration) ClientOptions {
	return ClientOptions{
		Timeout:               timeout,
		DialTimeout:           2 * time.Second,
		KeepAlive:             30 * time.Second,
		MaxIdleConns:          100,
		MaxIdleConnsPerHost:   25,
		IdleConnTimeout:       90 * time.Second,
		ResponseHeaderTimeout: timeout,
		TLSHandshakeTimeout:   3 * time.Second,
	}
}

// NewResilientClient builds an *http.Client configured with bounded connection reuse and strict timeouts.
func NewResilientClient(opts ClientOptions) *http.Client {
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   opts.DialTimeout,
			KeepAlive: opts.KeepAlive,
		}).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          opts.MaxIdleConns,
		MaxIdleConnsPerHost:   opts.MaxIdleConnsPerHost,
		IdleConnTimeout:       opts.IdleConnTimeout,
		ResponseHeaderTimeout: opts.ResponseHeaderTimeout,
		TLSHandshakeTimeout:   opts.TLSHandshakeTimeout,
		ExpectContinueTimeout: 1 * time.Second,
	}

	return &http.Client{
		Transport: transport,
		Timeout:   opts.Timeout,
	}
}
