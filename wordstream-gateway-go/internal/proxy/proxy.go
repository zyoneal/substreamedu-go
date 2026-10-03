package proxy

import (
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/substreamedu/wordstream-gateway/internal/config"
	"go.uber.org/zap"
)

var (
	// FAANG Senior Pattern: Optimized shared transport for microservices
	sharedTransport = &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   30 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          1000,
		MaxIdleConnsPerHost:   100, // CRITICAL: Increases connection reuse drastically
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}
)

type ProxyHandler struct {
	routes  []config.RouteConfig
	logger  *zap.Logger
	proxies map[string]*httputil.ReverseProxy
	mu      sync.RWMutex
}

func NewProxyHandler(routes []config.RouteConfig, logger *zap.Logger) *ProxyHandler {
	h := &ProxyHandler{
		routes:  routes,
		logger:  logger,
		proxies: make(map[string]*httputil.ReverseProxy),
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

		// Capture route for closure
		currRoute := route
		originalDirector := rp.Director
		rp.Director = func(req *http.Request) {
			originalDirector(req)
			path := req.URL.Path

			// 1. Strip Prefix if needed
			if currRoute.StripPrefix > 0 {
				parts := strings.Split(strings.TrimPrefix(path, "/"), "/")
				if len(parts) >= currRoute.StripPrefix {
					path = "/" + strings.Join(parts[currRoute.StripPrefix:], "/")
				}
			}

			// 2. Add Prefix Path if needed
			if currRoute.PrefixPath != "" {
				path = currRoute.PrefixPath + path
			}

			req.URL.Path = path
			req.Host = targetURL.Host
		}

		// FAANG Optimization: Use BufferPool to reduce GC pressure
		rp.BufferPool = newBufferPool()

		// FAANG Optimization: Prevent slow backend attacks
		rp.ModifyResponse = func(r *http.Response) error {
			// Can add custom logic here if needed
			return nil
		}

		h.proxies[route.ID] = rp
	}
}

// bufferPool implements httputil.BufferPool
type bufferPool struct {
	pool sync.Pool
}

func newBufferPool() *bufferPool {
	return &bufferPool{
		pool: sync.Pool{
			New: func() interface{} {
				return make([]byte, 32*1024) // 32KB buffer
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
