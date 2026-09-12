package router_test

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/handler"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/middleware"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/router"
	"go.uber.org/zap"
)

func TestRouter_RoutesRegistered(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	dh := &handler.DictionaryHandler{}
	ah := &handler.AdminHandler{}
	hh := &handler.HealthHandler{}
	logger := zap.NewNop()
	rateLimiter := middleware.NewRateLimiter(100, 100)

	router.Setup(r, "/api", dh, ah, hh, logger, "test-secret", rateLimiter)

	routes := r.Routes()
	routeMap := make(map[string]string)
	for _, route := range routes {
		routeMap[route.Method+":"+route.Path] = route.Handler
	}

	// Verify crucial routes exist
	assert.Contains(t, routeMap, "GET:/api/dictionary/resources/items/light")
	assert.Contains(t, routeMap, "GET:/api/dictionary/resources/items")
	assert.Contains(t, routeMap, "GET:/api/dictionary/resources/:name/items")
	assert.Contains(t, routeMap, "GET:/api/dictionary/srs/stats")
	assert.Contains(t, routeMap, "GET:/api/dictionary/srs/today")

	// Verify request dispatching for items/light matches (even if unauthenticated/empty context)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/dictionary/resources/items/light?limit=10000", bytes.NewReader([]byte{}))
	r.ServeHTTP(w, req)
	// Shouldn't be 404
	assert.NotEqual(t, http.StatusNotFound, w.Code)
}
