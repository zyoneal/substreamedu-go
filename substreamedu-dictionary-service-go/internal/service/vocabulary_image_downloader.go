package service

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
	"io"

	"go.uber.org/zap"
)

// IsSafePublicImageURL validates that the given URL uses http/https, does not point to
// localhost, internal Docker services, private IP ranges (RFC 1918), link-local, loopback, or cloud metadata.
func IsSafePublicImageURL(rawURL string) bool {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return false
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return false
	}
	hostname := strings.ToLower(parsed.Hostname())
	if hostname == "" || hostname == "localhost" {
		return false
	}

	// Block known container / infrastructure hostnames
	internalHosts := map[string]bool{
		"localhost":            true,
		"iam-service":          true,
		"dictionary-service":   true,
		"media-service":        true,
		"notification-service": true,
		"gateway":              true,
		"caddy":                true,
		"postgres":             true,
		"redis":                true,
		"kafka":                true,
		"jaeger":               true,
		"prometheus":           true,
		"grafana":              true,
		"host.docker.internal": true,
	}
	if internalHosts[hostname] {
		return false
	}

	// Direct IP parse or DNS lookup
	if ip := net.ParseIP(hostname); ip != nil {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
			return false
		}
		return true
	}

	ips, err := net.LookupIP(hostname)
	if err != nil || len(ips) == 0 {
		return false
	}
	for _, ip := range ips {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
			return false
		}
	}
	return true
}

func (s *VocabularyService) downloadAndStoreImageAsync(cardID int64, productionCardID int64, remoteURL string) {
	if remoteURL == "" || !IsSafePublicImageURL(remoteURL) {
		s.logger.Warn("Refusing image download: URL is empty or failed SSRF safety check", zap.String("url", remoteURL))
		return
	}

	go func() {
		select {
		case s.imageDownloadSem <- struct{}{}:
			defer func() { <-s.imageDownloadSem }()
		case <-time.After(5 * time.Second):
			s.logger.Warn("Image download worker pool full, skipping async image download", zap.Int64("cardID", cardID))
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		s.logger.Info("Starting background image download", zap.Int64("cardID", cardID), zap.String("url", remoteURL))

		mediaDir := os.Getenv("SHARED_MEDIA_DIR")
		if mediaDir == "" {
			mediaDir = "/var/www/shared_media"
		}

		targetDir := filepath.Join(mediaDir, "images", "words")
		if err := os.MkdirAll(targetDir, 0755); err != nil {
			s.logger.Error("Failed to create shared media directory", zap.Error(err), zap.String("dir", targetDir))
			return
		}

		ext := ".png"
		if strings.Contains(strings.ToLower(remoteURL), ".jpg") || strings.Contains(strings.ToLower(remoteURL), ".jpeg") {
			ext = ".jpg"
		} else if strings.Contains(strings.ToLower(remoteURL), ".webp") {
			ext = ".webp"
		}

		fileName := fmt.Sprintf("%d%s", cardID, ext)
		filePath := filepath.Join(targetDir, fileName)

		req, err := http.NewRequestWithContext(ctx, "GET", remoteURL, nil)
		if err != nil {
			s.logger.Error("Failed to create download request", zap.Error(err))
			return
		}

		safeTransport := &http.Transport{
			DialContext: func(dialCtx context.Context, network, addr string) (net.Conn, error) {
				host, port, err := net.SplitHostPort(addr)
				if err != nil {
					return nil, err
				}
				ips, err := net.DefaultResolver.LookupIP(dialCtx, "ip", host)
				if err != nil || len(ips) == 0 {
					return nil, fmt.Errorf("failed to resolve host %s", host)
				}
				for _, ip := range ips {
					if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
						return nil, fmt.Errorf("SSRF: connecting to private/loopback IP blocked: %s", ip.String())
					}
				}
				var dialer net.Dialer
				return dialer.DialContext(dialCtx, network, net.JoinHostPort(ips[0].String(), port))
			},
			TLSHandshakeTimeout: 10 * time.Second,
		}

		client := &http.Client{
			Timeout:   15 * time.Second,
			Transport: safeTransport,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				if len(via) >= 3 {
					return fmt.Errorf("too many redirects")
				}
				if !IsSafePublicImageURL(req.URL.String()) {
					return fmt.Errorf("SSRF: redirect to unsafe address blocked: %s", req.URL.String())
				}
				return nil
			},
		}
		resp, err := client.Do(req)
		if err != nil {
			s.logger.Error("Failed to download image from remote URL", zap.Error(err), zap.String("url", remoteURL))
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			s.logger.Error("Remote server returned non-OK status during image download", zap.Int("status", resp.StatusCode), zap.String("url", remoteURL))
			return
		}

		contentType := strings.ToLower(resp.Header.Get("Content-Type"))
		if !strings.HasPrefix(contentType, "image/") {
			s.logger.Warn("Refusing to store downloaded file: non-image Content-Type", zap.String("contentType", contentType), zap.String("url", remoteURL))
			return
		}

		const maxImageDownloadBytes = 5 * 1024 * 1024 // 5MB
		limitedBody := io.LimitReader(resp.Body, maxImageDownloadBytes+1)

		out, err := os.Create(filePath)
		if err != nil {
			s.logger.Error("Failed to create local image file", zap.Error(err), zap.String("path", filePath))
			return
		}
		defer out.Close()

		written, err := io.Copy(out, limitedBody)
		if err != nil {
			s.logger.Error("Failed to save downloaded image to local file", zap.Error(err))
			os.Remove(filePath)
			return
		}

		if written > maxImageDownloadBytes {
			s.logger.Warn("Downloaded image exceeded 5MB size limit, deleting", zap.Int64("bytes", written))
			os.Remove(filePath)
			return
		}

		localURL := fmt.Sprintf("/videos/images/words/%s", fileName)

		if err := s.repo.UpdateImageUrl(ctx, cardID, localURL); err != nil {
			s.logger.Error("Failed to update image URL for card recognition", zap.Error(err), zap.Int64("cardID", cardID))
			return
		}
		if productionCardID > 0 {
			if err := s.repo.UpdateImageUrl(ctx, productionCardID, localURL); err != nil {
				s.logger.Error("Failed to update image URL for card production", zap.Error(err), zap.Int64("cardID", productionCardID))
			}
		}

		s.logger.Info("Successfully downloaded and cached image locally", zap.Int64("cardID", cardID), zap.String("localURL", localURL))
	}()
}
