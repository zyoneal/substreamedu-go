package middleware

import (
	"compress/gzip"
	"io"
	"net/http"
	"strings"
	"sync"
)

var gzipPool = sync.Pool{
	New: func() interface{} {
		w, _ := gzip.NewWriterLevel(io.Discard, gzip.DefaultCompression)
		return w
	},
}

func Gzip(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}

		w.Header().Set("Vary", "Accept-Encoding")

		gzr := &gzipResponseWriter{
			ResponseWriter:	w,
			request:	r,
		}
		defer gzr.Close()

		next.ServeHTTP(gzr, r)
	})
}

type gzipResponseWriter struct {
	http.ResponseWriter
	request		*http.Request
	gzWriter	*gzip.Writer
	wroteHeader	bool
	skipGzip	bool
}

func (g *gzipResponseWriter) shouldSkipGzip() bool {

	if g.Header().Get("Content-Encoding") != "" {
		return true
	}

	ct := g.Header().Get("Content-Type")

	if strings.HasPrefix(ct, "image/") ||
		strings.HasPrefix(ct, "video/") ||
		strings.HasPrefix(ct, "audio/") ||
		strings.Contains(ct, "application/octet-stream") ||
		strings.Contains(ct, "application/zip") ||
		strings.Contains(ct, "application/gzip") {
		return true
	}

	return false
}

func (g *gzipResponseWriter) WriteHeader(statusCode int) {
	if g.wroteHeader {
		return
	}
	g.wroteHeader = true

	g.skipGzip = g.shouldSkipGzip()

	if !g.skipGzip {

		g.Header().Del("Content-Length")
		g.Header().Set("Content-Encoding", "gzip")
	}

	g.ResponseWriter.WriteHeader(statusCode)
}

func (g *gzipResponseWriter) Write(b []byte) (int, error) {

	if !g.wroteHeader {
		g.WriteHeader(http.StatusOK)
	}

	if g.skipGzip {
		return g.ResponseWriter.Write(b)
	}

	if g.gzWriter == nil {
		gz := gzipPool.Get().(*gzip.Writer)
		gz.Reset(g.ResponseWriter)
		g.gzWriter = gz
	}

	return g.gzWriter.Write(b)
}

func (g *gzipResponseWriter) Flush() {
	if g.gzWriter != nil {
		g.gzWriter.Flush()
	}
	if flusher, ok := g.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func (g *gzipResponseWriter) Close() {
	if g.gzWriter != nil {
		g.gzWriter.Close()
		gzipPool.Put(g.gzWriter)
		g.gzWriter = nil
	}
}
