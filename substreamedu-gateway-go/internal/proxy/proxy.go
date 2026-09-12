package proxy

import (
	"encoding/json"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/substreamedu/substreamedu-gateway/internal/config"
	"go.uber.org/zap"
)

var (
	sharedTransport = &http.Transport{
		Proxy:	http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:	30 * time.Second,
			KeepAlive:	30 * time.Second,
		}).DialContext,
		ForceAttemptHTTP2:	true,
		MaxIdleConns:		1000,
		MaxIdleConnsPerHost:	100,
		IdleConnTimeout:	90 * time.Second,
		TLSHandshakeTimeout:	10 * time.Second,
		ExpectContinueTimeout:	1 * time.Second,
	}
)

type ProxyHandler struct {
	routes		[]config.RouteConfig
	logger		*zap.Logger
	proxies		map[string]*httputil.ReverseProxy
	breakers	map[string]*CircuitBreaker
	mu		sync.RWMutex
}

func NewProxyHandler(routes []config.RouteConfig, logger *zap.Logger) *ProxyHandler {
	h := &ProxyHandler{
		routes:		routes,
		logger:		logger,
		proxies:	make(map[string]*httputil.ReverseProxy),
		breakers:	make(map[string]*CircuitBreaker),
	}
	h.initProxies()
	return h
}

func (h *ProxyHandler) initProxies() {
	for _, route := range h.routes {
		targetURL, err := url.Parse(route.ProxyTarget)
		if err != nil {
			h.logger.Error("Invalid proxy target in config", zap.String("id", route.ID), zap.Error(err))
			continue
		}

		rp := httputil.NewSingleHostReverseProxy(targetURL)
		rp.Transport = sharedTransport

		currRoute := route
		originalDirector := rp.Director
		rp.Director = func(req *http.Request) {
			originalDirector(req)
			path := req.URL.Path

			if currRoute.StripPrefix > 0 {
				parts := strings.Split(strings.TrimPrefix(path, "/"), "/")
				if len(parts) >= currRoute.StripPrefix {
					path = "/" + strings.Join(parts[currRoute.StripPrefix:], "/")
				}
			}

			if currRoute.PrefixPath != "" {
				path = currRoute.PrefixPath + path
			}

			req.URL.Path = path
			req.Host = targetURL.Host

			for _, header := range []string{"X-Request-ID", "X-Correlation-ID", "traceparent"} {
				if v := req.Header.Get(header); v != "" {
					req.Header.Set(header, v)
				}
			}
		}

		h.breakers[route.ID] = NewCircuitBreaker(5, 30*time.Second)
		currBreaker := h.breakers[route.ID]

		rp.BufferPool = newBufferPool()

		rp.ModifyResponse = func(r *http.Response) error {
			if r.StatusCode >= 500 {
				currBreaker.Failure()
			} else {
				currBreaker.Success()
			}
			return nil
		}

		rp.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
			currBreaker.Failure()
			h.logger.Error("Proxy error", zap.String("route", currRoute.ID), zap.Error(err))
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadGateway)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success":	false,
				"message":	"Backend service unavailable",
			})
		}

		h.proxies[route.ID] = rp
	}
}

type bufferPool struct {
	pool sync.Pool
}

func newBufferPool() *bufferPool {
	return &bufferPool{
		pool: sync.Pool{
			New: func() interface{} {
				return make([]byte, 32*1024)
			},
		},
	}
}

func (b *bufferPool) Get() []byte {
	return b.pool.Get().([]byte)
}

func (b *bufferPool) Put(x []byte) {
	b.pool.Put(x)
}

func (h *ProxyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	for _, route := range h.routes {
		if h.match(r.URL.Path, route.Path) {
			if proxy, ok := h.proxies[route.ID]; ok {
				if breaker, ok := h.breakers[route.ID]; ok {
					if !breaker.Allow() {
						w.Header().Set("Content-Type", "application/json")
						w.WriteHeader(http.StatusServiceUnavailable)
						json.NewEncoder(w).Encode(map[string]interface{}{
							"success":	false,
							"message":	"Service temporarily unavailable",
						})
						return
					}
				}
				proxy.ServeHTTP(w, r)
				return
			}
		}
	}
	http.NotFound(w, r)
}

func (h *ProxyHandler) match(path string, patterns []string) bool {
	for _, pattern := range patterns {
		if strings.HasSuffix(pattern, "/**") {
			prefix := strings.TrimSuffix(pattern, "/**")
			if strings.HasPrefix(path, prefix) {
				return true
			}
		} else if path == pattern {
			return true
		}
	}
	return false
}
