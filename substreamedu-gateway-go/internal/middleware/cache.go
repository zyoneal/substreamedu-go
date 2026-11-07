package middleware

import (
	"bytes"
	"net/http"
	"time"

	"github.com/substreamedu/substreamedu-gateway/internal/cache"
)

type cacheEntry struct {
	ContentType	string
	Body		[]byte
}

type cacheResponseWriter struct {
	http.ResponseWriter
	buf		bytes.Buffer
	key		string
	cache		*cache.ResponseCache
	contentType	string
	statusCode	int
}

func (w *cacheResponseWriter) WriteHeader(statusCode int) {
	w.statusCode = statusCode
	w.contentType = w.Header().Get("Content-Type")
	w.ResponseWriter.WriteHeader(statusCode)
}

func (w *cacheResponseWriter) Write(b []byte) (int, error) {
	if w.statusCode == 0 {
		w.statusCode = http.StatusOK
		w.contentType = w.Header().Get("Content-Type")
	}
	w.buf.Write(b)
	return w.ResponseWriter.Write(b)
}

func Cache(responseCache *cache.ResponseCache) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// SECURITY: Never trust client-supplied X-User-Id or ?userId= for cache identity.
			// Authenticated requests (with Authorization or Cookie) must not be cached at edge gateway
			// to prevent cache poisoning and cross-user data leaks.
			if r.Header.Get("Authorization") != "" || r.Header.Get("Cookie") != "" {
				next.ServeHTTP(w, r)
				return
			}

			if r.Method != http.MethodGet {
				next.ServeHTTP(w, r)
				return
			}

			pathWithQuery := r.URL.Path
			if r.URL.RawQuery != "" {
				pathWithQuery += "?" + r.URL.RawQuery
			}

			key := responseCache.Key(r.Method, pathWithQuery)

			if data, ok := responseCache.Get(r.Context(), key); ok {
				w.Header().Set("X-Cache", "HIT")

				ct, body := splitCacheData(data)
				if ct != "" {
					w.Header().Set("Content-Type", ct)
				}
				w.Write(body)
				return
			}

			cw := &cacheResponseWriter{
				ResponseWriter:	w,
				key:		key,
				cache:		responseCache,
			}
			next.ServeHTTP(cw, r)

			if cw.buf.Len() > 0 && cw.statusCode >= 200 && cw.statusCode < 300 {

				cacheData := buildCacheData(cw.contentType, cw.buf.Bytes())
				responseCache.Set(r.Context(), key, cacheData, 60*time.Second)
			}
		})
	}
}

func buildCacheData(contentType string, body []byte) []byte {
	prefix := []byte(contentType + "\n")
	result := make([]byte, len(prefix)+len(body))
	copy(result, prefix)
	copy(result[len(prefix):], body)
	return result
}

func splitCacheData(data []byte) (string, []byte) {
	idx := bytes.IndexByte(data, '\n')
	if idx < 0 {

		return "", data
	}
	return string(data[:idx]), data[idx+1:]
}
