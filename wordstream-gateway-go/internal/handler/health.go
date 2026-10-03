package handler

import (
	"encoding/json"
	"net/http"

	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type HealthHandler struct{}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/gateway/actuator/health" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "UP"})
		return
	}
	if r.URL.Path == "/gateway/actuator/prometheus" {
		promhttp.Handler().ServeHTTP(w, r)
		return
	}
	http.NotFound(w, r)
}
