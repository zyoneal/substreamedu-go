// Package client provides external API clients.
package client

import (
	"context"
	"encoding/json" // Keep for now, might be used elsewhere or for future XML parsing
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"            // Added for yt-dlp temp files
	"os/exec"       // Added for yt-dlp
	"path/filepath" // Added for yt-dlp
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/substreamedu/wordstream-media-service/internal/dto"
	"github.com/substreamedu/wordstream-media-service/internal/parser" // Added for ParseYoutubeXML and ParseVtt
	"go.uber.org/zap"
)

type YouTubeTranscriptClient struct {
	httpClient *http.Client
	logger     *zap.Logger
	cache      *transcriptCache
	englishReg *regexp.Regexp // Precompiled regex for English detection
}

// transcriptCache provides in-memory caching for transcripts.
type transcriptCache struct {
	mu      sync.RWMutex
	entries map[string]*cacheEntry
	maxSize int
}

type cacheEntry struct {
	data      []dto.SubtitleResponseDto
	expiresAt time.Time
}

// Invidious instances for fallback (vetted for stability)
var invidiousInstances = []string{
	"https://invidious.projectsegfau.lt",
	"https://invidious.flokinet.to",
	"https://inv.tux.digital",
	"https://iv.melmac.space",
	"https://invidious.protokolla.fi",
	"https://yewtu.be",
}

var userAgents = []string{
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
}

func getRandomUserAgent() string {
	return userAgents[time.Now().UnixNano()%int64(len(userAgents))]
}

func NewYouTubeTranscriptClient(logger *zap.Logger) *YouTubeTranscriptClient {
	return &YouTubeTranscriptClient{
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
		logger: logger,
		cache: &transcriptCache{
			entries: make(map[string]*cacheEntry),
			maxSize: 1000,
		},
		englishReg: regexp.MustCompile(`(?i)(\b|_)(en|english)(_|\b)`),
	}
}

// FetchTranscript fetches transcript for a YouTube video.
// Uses primary timedtext API with Invidious fallback.
func (c *YouTubeTranscriptClient) FetchTranscript(ctx context.Context, videoID string) ([]dto.SubtitleResponseDto, error) {
	c.logger.Info("Starting transcript fetch", zap.String("videoId", videoID))

	// Check cache first
	if cached := c.cache.get(videoID); cached != nil {
		c.logger.Info("Transcript cache hit", zap.String("videoId", videoID))
		return cached, nil
	}

	// Strategy A: InnerTube API (Official-like back-end)
	c.logger.Debug("Attempting Strategy A: InnerTube API", zap.String("videoId", videoID))
	result, err := c.fetchFromInnerTube(ctx, videoID)
	if err == nil && len(result) > 0 {
		c.logger.Info("Strategy A (InnerTube) successful", zap.String("videoId", videoID), zap.Int("count", len(result)))
		c.cache.set(videoID, result, 1*time.Hour)
		return result, nil
	}
	c.logger.Warn("Strategy A (InnerTube) failed", zap.String("videoId", videoID), zap.Error(err))

	// Strategy B: yt-dlp (Robust "Heavy Hitter")
	c.logger.Info("Attempting Strategy B: yt-dlp", zap.String("videoId", videoID))
	result, err = c.fetchViaYtDlp(ctx, videoID)
	if err == nil && len(result) > 0 {
		c.logger.Info("Strategy B successful", zap.String("videoId", videoID), zap.Int("count", len(result)))
		c.cache.set(videoID, result, 1*time.Hour)
		return result, nil
	}
	c.logger.Warn("Strategy B failed", zap.String("videoId", videoID), zap.Error(err))

	// Strategy C: Scraper (Initial Player Response)
	c.logger.Info("Attempting Strategy C: Scraper Fallback", zap.String("videoId", videoID))
	result, err = c.fetchFromYouTube(ctx, videoID)
	if err == nil && len(result) > 0 {
		c.logger.Info("Strategy C (Scraper) successful", zap.String("videoId", videoID), zap.Int("count", len(result)))
		c.cache.set(videoID, result, 1*time.Hour)
		return result, nil
	}
	c.logger.Warn("Strategy C failed", zap.String("videoId", videoID), zap.Error(err))

	// Strategy D: Invidious API (Resilient Fallback)
	c.logger.Info("Attempting Strategy D: Invidious Fallback", zap.String("videoId", videoID))
	result, err = c.fetchFromInvidious(ctx, videoID)
	if err == nil && len(result) > 0 {
		c.logger.Info("Strategy D successful", zap.String("videoId", videoID), zap.Int("count", len(result)))
		c.cache.set(videoID, result, 1*time.Hour)
		return result, nil
	}

	c.logger.Error("All transcript strategies failed", zap.String("videoId", videoID), zap.Error(err))
	return []dto.SubtitleResponseDto{}, nil
}

// InnerTube types
type innerTubeRequest struct {
	Context struct {
		Client struct {
			ClientName    string `json:"clientName"`
			ClientVersion string `json:"clientVersion"`
			Hl            string `json:"hl"`
		} `json:"client"`
	} `json:"context"`
	VideoID string `json:"videoId"`
}

type innerTubeResponse struct {
	Captions struct {
		PlayerCaptionsTracklistRenderer struct {
			CaptionTracks []struct {
				BaseURL string `json:"baseUrl"`
				VssID   string `json:"vssId"`
				Kind    string `json:"kind"`
			} `json:"captionTracks"`
		} `json:"playerCaptionsTracklistRenderer"`
	} `json:"captions"`
}

// fetchFromInnerTube uses the official InnerTube API to find captions.
func (c *YouTubeTranscriptClient) fetchFromInnerTube(ctx context.Context, videoID string) ([]dto.SubtitleResponseDto, error) {
	apiURL := "https://www.youtube.com/youtubei/v1/player"

	payload := innerTubeRequest{}
	payload.Context.Client.ClientName = "WEB"
	payload.Context.Client.ClientVersion = "2.20240501.01.00"
	payload.Context.Client.Hl = "en"
	payload.VideoID = videoID

	jsonPayload, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return nil, err
	}

	ua := getRandomUserAgent()
	req.Header.Set("User-Agent", ua)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", "https://www.youtube.com")
	req.Header.Set("Referer", "https://www.youtube.com")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.logger.Warn("InnerTube API returned error status", zap.Int("status", resp.StatusCode), zap.String("videoId", videoID))
		return nil, fmt.Errorf("InnerTube API returned status %d", resp.StatusCode)
	}

	var innerResp innerTubeResponse
	if err := json.NewDecoder(resp.Body).Decode(&innerResp); err != nil {
		return nil, fmt.Errorf("failed to decode InnerTube response: %w", err)
	}

	tracks := innerResp.Captions.PlayerCaptionsTracklistRenderer.CaptionTracks
	if len(tracks) == 0 {
		return nil, fmt.Errorf("no caption tracks in InnerTube response")
	}

	// Map InnerTube tracks to selection-agnostic struct
	tracklist := make([]subtitleTrack, 0, len(tracks))
	for _, t := range tracks {
		tracklist = append(tracklist, subtitleTrack{
			ID:           t.BaseURL,
			LanguageCode: t.VssID, // InnerTube uses VssID like ".en", "a.en" (ASR)
			IsASR:        t.Kind == "asr",
		})
	}

	c.logger.Debug("InnerTube tracks found", zap.Int("total", len(tracklist)), zap.String("videoId", videoID))
	engTracks := c.prioritizeEnglishTracks(tracklist)
	if len(engTracks) == 0 {
		return nil, fmt.Errorf("no English subtitle tracks found in InnerTube")
	}

	// Try prioritized tracks one by one
	var lastErr error
	for _, t := range engTracks {
		c.logger.Info("Trying InnerTube English track", zap.String("lang", t.LanguageCode), zap.String("videoId", videoID))
		result, err := c.fetchCaptionData(ctx, t.ID, "json3")
		if err == nil && len(result) > 0 {
			return result, nil
		}
		lastErr = err
		c.logger.Warn("InnerTube track fetch failed, trying next", zap.String("lang", t.LanguageCode), zap.Error(err))
	}

	return nil, fmt.Errorf("failed to fetch any English tracks from InnerTube: %w", lastErr)
}

// fetchViaYtDlp uses yt-dlp to download and parse subtitles.
func (c *YouTubeTranscriptClient) fetchViaYtDlp(ctx context.Context, videoID string) ([]dto.SubtitleResponseDto, error) {
	tempDir, err := os.MkdirTemp("", "yt-dlp-subs-"+videoID)
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(tempDir)

	ua := getRandomUserAgent()
	outputPath := filepath.Join(tempDir, "subs")
	cmd := exec.CommandContext(ctx, "yt-dlp",
		"--write-subs", "--write-auto-sub",
		"--sub-lang", "en.*,en-US,en-GB",
		"--skip-download",
		"--force-ipv4",
		"--user-agent", ua,
		"--referer", "https://www.youtube.com/watch?v="+videoID,
		"--output", outputPath,
		"https://www.youtube.com/watch?v="+videoID)

	output, err := cmd.CombinedOutput()
	if err != nil {
		c.logger.Warn("yt-dlp execution returned non-zero status, checking for partial downloads",
			zap.String("videoId", videoID),
			zap.Error(err))
	} else {
		c.logger.Debug("yt-dlp successful", zap.String("videoId", videoID))
	}

	files, errGlob := filepath.Glob(outputPath + ".*.vtt")
	if errGlob != nil || len(files) == 0 {
		c.logger.Warn("No VTT files found via yt-dlp", zap.String("videoId", videoID), zap.String("outputPath", outputPath))
		if err != nil {
			return nil, fmt.Errorf("yt-dlp failed and no files found: %w, output: %s", err, string(output))
		}
		return nil, fmt.Errorf("no VTT file found after yt-dlp execution")
	}

	c.logger.Debug("Found VTT files", zap.String("videoId", videoID), zap.Strings("files", files))

	// Map files to selection-agnostic struct
	tracklist := make([]subtitleTrack, 0, len(files))
	for _, f := range files {
		filename := filepath.Base(f)
		tracklist = append(tracklist, subtitleTrack{
			ID:           f,
			LanguageCode: filename, // Use filename for matching
			IsASR:        strings.Contains(strings.ToLower(filename), ".asr"),
		})
	}

	engTracks := c.prioritizeEnglishTracks(tracklist)
	if len(engTracks) == 0 {
		return nil, fmt.Errorf("no English subtitle tracks found in yt-dlp output")
	}

	// Try parsing files
	for _, t := range engTracks {
		f := t.ID
		content, err := os.ReadFile(f)
		if err != nil {
			continue
		}
		lines := strings.Split(string(content), "\n")
		return parser.ParseVtt(lines), nil
	}

	return nil, fmt.Errorf("failed to read any English subtitle files from yt-dlp")
}

// fetchFromYouTube fetches transcript using YouTube's internal timedtext API.
func (c *YouTubeTranscriptClient) fetchFromYouTube(ctx context.Context, videoID string) ([]dto.SubtitleResponseDto, error) {
	// Step 1: Fetch video page to get player response
	videoURL := fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, videoURL, nil)
	if err != nil {
		return nil, err
	}

	ua := getRandomUserAgent()
	req.Header.Set("User-Agent", ua)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Cache-Control", "no-cache")
	req.Header.Set("Pragma", "no-cache")
	req.Header.Set("Sec-Ch-Ua", `"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"`)
	req.Header.Set("Sec-Ch-Ua-Mobile", "?0")
	req.Header.Set("Sec-Ch-Ua-Platform", `"Windows"`)
	req.Header.Set("Sec-Fetch-Dest", "document")
	req.Header.Set("Sec-Fetch-Mode", "navigate")
	req.Header.Set("Sec-Fetch-Site", "none")
	req.Header.Set("Sec-Fetch-User", "?1")
	req.Header.Set("Upgrade-Insecure-Requests", "1")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		return nil, fmt.Errorf("YouTube returned 429 Too Many Requests")
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Step 2: Extract caption tracks from ytInitialPlayerResponse
	// Look for ytInitialPlayerResponse
	re := regexp.MustCompile(`ytInitialPlayerResponse\s*=\s*({.*?});`)
	match := re.FindStringSubmatch(string(body))
	if match == nil {
		// Try without the semicolon
		re = regexp.MustCompile(`ytInitialPlayerResponse\s*=\s*({.*?})<`)
		match = re.FindStringSubmatch(string(body))
	}

	if match == nil {
		return nil, fmt.Errorf("could not find ytInitialPlayerResponse")
	}

	var playerResponse struct {
		Captions struct {
			PlayerCaptionsTracklistRenderer struct {
				CaptionTracks []struct {
					BaseURL      string `json:"baseUrl"`
					LanguageCode string `json:"languageCode"`
					Kind         string `json:"kind"`
				} `json:"captionTracks"`
			} `json:"playerCaptionsTracklistRenderer"`
		} `json:"captions"`
	}

	if err := json.Unmarshal([]byte(match[1]), &playerResponse); err != nil {
		return nil, fmt.Errorf("failed to parse player response: %w", err)
	}

	tracks := playerResponse.Captions.PlayerCaptionsTracklistRenderer.CaptionTracks
	if len(tracks) == 0 {
		return nil, fmt.Errorf("no caption tracks available in player response")
	}

	// Map scraper tracks to selection-agnostic struct
	tracklist := make([]subtitleTrack, 0, len(tracks))
	for _, t := range tracks {
		tracklist = append(tracklist, subtitleTrack{
			ID:           t.BaseURL,
			LanguageCode: t.LanguageCode,
			IsASR:        t.Kind == "asr" || strings.Contains(strings.ToLower(t.BaseURL), "kind=asr"),
		})
	}

	engTracks := c.prioritizeEnglishTracks(tracklist)
	if len(engTracks) == 0 {
		return nil, fmt.Errorf("no English subtitle tracks found in scraper fallback")
	}

	var lastErr error
	for _, t := range engTracks {
		c.logger.Info("Trying Scraper English track", zap.String("lang", t.LanguageCode), zap.String("videoId", videoID))
		result, err := c.fetchFromYouTubeV3(ctx, videoID, t.ID)
		if err == nil && len(result) > 0 {
			return result, nil
		}
		lastErr = err
		c.logger.Warn("Scraper track failed, trying next track", zap.String("lang", t.LanguageCode), zap.Error(err))
	}

	return nil, fmt.Errorf("all Scraper English tracks failed: %w", lastErr)
}

// fetchFromYouTubeV3 is a helper to try multiple formats for a specific URL.
func (c *YouTubeTranscriptClient) fetchFromYouTubeV3(ctx context.Context, videoID, captionURL string) ([]dto.SubtitleResponseDto, error) {
	// Strategy A.1: Try JSON3 (Modern, more data)
	c.logger.Debug("Attempting Strategy A.1: JSON3 Scraper", zap.String("videoId", videoID))
	result, err := c.fetchCaptionData(ctx, captionURL, "json3")
	if err == nil && len(result) > 0 {
		return result, nil
	}
	c.logger.Warn("Strategy A.1 failed, trying A.2: XML Scraper", zap.String("videoId", videoID), zap.Error(err))

	// Strategy A.2: Try XML (srv1)
	result, err = c.fetchCaptionData(ctx, captionURL, "srv1")
	if err == nil && len(result) > 0 {
		return result, nil
	}
	c.logger.Warn("Strategy A.2 failed, trying A.3: VTT Scraper", zap.String("videoId", videoID), zap.Error(err))

	// Strategy A.3: Try VTT (fallback for tracks that only support VTT, rare but happens)
	return c.fetchCaptionData(ctx, captionURL, "vtt")
}

// extractCaptionURL extracts caption URL from YouTube page HTML.
// This function is no longer used directly, its logic is integrated into fetchFromYouTube.
// func (c *YouTubeTranscriptClient) extractCaptionURL(html string) (string, error) {
// 	// Look for ytInitialPlayerResponse
// 	re := regexp.MustCompile(`ytInitialPlayerResponse\s*=\s*({.*?});`)
// 	match := re.FindStringSubmatch(html)
// 	if match == nil {
// 		// Try without the semicolon
// 		re = regexp.MustCompile(`ytInitialPlayerResponse\s*=\s*({.*?})<`)
// 		match = re.FindStringSubmatch(html)
// 	}

// 	if match == nil {
// 		return "", fmt.Errorf("could not find ytInitialPlayerResponse")
// 	}

// 	var playerResponse struct {
// 		Captions struct {
// 			PlayerCaptionsTracklistRenderer struct {
// 				CaptionTracks []struct {
// 					BaseURL      string `json:"baseUrl"`
// 					LanguageCode string `json:"languageCode"`
// 					Kind         string `json:"kind"`
// 				} `json:"captionTracks"`
// 			} `json:"playerCaptionsTracklistRenderer"`
// 		} `json:"captions"`
// 	}

// 	if err := json.Unmarshal([]byte(match[1]), &playerResponse); err != nil {
// 		return "", fmt.Errorf("failed to parse player response: %w", err)
// 	}

// 	tracks := playerResponse.Captions.PlayerCaptionsTracklistRenderer.CaptionTracks
// 	if len(tracks) == 0 {
// 		return "", fmt.Errorf("no caption tracks available in player response")
// 	}

// 	// Map scraper tracks to selection-agnostic struct
// 	tracklist := make([]subtitleTrack, 0, len(tracks))
// 	for _, t := range tracks {
// 		tracklist = append(tracklist, subtitleTrack{
// 			ID:           t.BaseURL,
// 			LanguageCode: t.LanguageCode,
// 			IsASR:        t.Kind == "asr",
// 		})
// 	}

// 	return c.selectBestEnglishTrack(tracklist)
// }

// fetchCaptionData fetches and parses YouTube caption data (XML or JSON3).
func (c *YouTubeTranscriptClient) fetchCaptionData(ctx context.Context, captionURL, format string) ([]dto.SubtitleResponseDto, error) {
	// Force format
	if !strings.Contains(captionURL, "fmt=") {
		if strings.Contains(captionURL, "?") {
			captionURL += "&fmt=" + format
		} else {
			captionURL += "?fmt=" + format
		}
	} else {
		// Replace existing format
		re := regexp.MustCompile(`fmt=[^&]+`)
		captionURL = re.ReplaceAllString(captionURL, "fmt="+format)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, captionURL, nil)
	if err != nil {
		return nil, err
	}

	ua := getRandomUserAgent()
	req.Header.Set("User-Agent", ua)
	req.Header.Set("Referer", "https://www.youtube.com/")
	req.Header.Set("Origin", "https://www.youtube.com")
	req.Header.Set("Accept", "*/*")
	req.Header.Set("Sec-Ch-Ua", `"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"`)
	req.Header.Set("Sec-Fetch-Dest", "empty")
	req.Header.Set("Sec-Fetch-Mode", "cors")
	req.Header.Set("Sec-Fetch-Site", "same-origin")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.logger.Warn("Caption data fetch failed",
			zap.String("format", format),
			zap.Int("status", resp.StatusCode),
			zap.String("url", captionURL))
		return nil, fmt.Errorf("YouTube timedtext API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if format == "json3" {
		return parser.ParseYoutubeJSON3(body)
	}
	if format == "vtt" {
		lines := strings.Split(string(body), "\n")
		return parser.ParseVtt(lines), nil
	}
	return parser.ParseYoutubeXML(body)
}

// fetchFromInvidious fetches transcript from Invidious API.
func (c *YouTubeTranscriptClient) fetchFromInvidious(ctx context.Context, videoID string) ([]dto.SubtitleResponseDto, error) {
	var lastErr error

	for _, instance := range invidiousInstances {
		result, err := c.tryInvidiousInstance(ctx, instance, videoID)
		if err == nil {
			return result, nil
		}
		lastErr = err
		c.logger.Debug("Invidious instance failed",
			zap.String("instance", instance),
			zap.Error(err))
	}

	return nil, fmt.Errorf("all Invidious instances failed: %w", lastErr)
}

// tryInvidiousInstance tries to fetch captions from a specific Invidious instance.
func (c *YouTubeTranscriptClient) tryInvidiousInstance(ctx context.Context, instance, videoID string) ([]dto.SubtitleResponseDto, error) {
	// First, get available captions
	captionsURL := fmt.Sprintf("%s/api/v1/captions/%s", instance, videoID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, captionsURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("invidious returned status %d", resp.StatusCode)
	}

	var captionsResp struct {
		Captions []struct {
			Label        string `json:"label"`
			LanguageCode string `json:"language_code"`
			URL          string `json:"url"`
		} `json:"captions"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&captionsResp); err != nil {
		return nil, err
	}

	if len(captionsResp.Captions) == 0 {
		return nil, fmt.Errorf("no captions available")
	}

	// Map Invidious tracks to selection-agnostic struct
	tracklist := make([]subtitleTrack, 0, len(captionsResp.Captions))
	for _, t := range captionsResp.Captions {
		// Invidious might have language in label but not code
		isASR := strings.Contains(strings.ToLower(t.Label), "auto-generated") ||
				 strings.Contains(strings.ToLower(t.URL), "kind=asr")

		tracklist = append(tracklist, subtitleTrack{
			ID:           t.URL,
			LanguageCode: t.LanguageCode,
			IsASR:        isASR,
		})
	}

	engTracks := c.prioritizeEnglishTracks(tracklist)
	if len(engTracks) == 0 {
		c.logger.Warn("Invidious English selection failed", zap.String("videoId", videoID))
		return nil, fmt.Errorf("no English subtitle tracks found in Invidious")
	}

	var lastErr error
	for _, t := range engTracks {
		captionURL := t.ID
		// Make URL absolute if needed
		if !strings.HasPrefix(captionURL, "http") {
			captionURL = instance + captionURL
		}

		c.logger.Info("Trying Invidious English track", zap.String("id", t.ID), zap.String("videoId", videoID))
		result, err := c.fetchVTTFromURL(ctx, captionURL)
		if err == nil && len(result) > 0 {
			return result, nil
		}
		lastErr = err
		c.logger.Warn("Invidious track fetch failed, trying next", zap.String("id", t.ID), zap.Error(err))
	}

	return nil, fmt.Errorf("all Invidious English tracks failed: %w", lastErr)
}

// fetchVTTFromURL fetches and parses VTT format subtitles.
func (c *YouTubeTranscriptClient) fetchVTTFromURL(ctx context.Context, vttURL string) ([]dto.SubtitleResponseDto, error) {
	// Add format=vtt if not present
	if !strings.Contains(vttURL, "format=") {
		if strings.Contains(vttURL, "?") {
			vttURL += "&format=vtt"
		} else {
			vttURL += "?format=vtt"
		}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, vttURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	lines := strings.Split(string(body), "\n")
	return parser.ParseVtt(lines), nil
}

// Cache methods
func (c *transcriptCache) get(videoID string) []dto.SubtitleResponseDto {
	c.mu.RLock()
	defer c.mu.RUnlock()

	entry, ok := c.entries[videoID]
	if !ok || time.Now().After(entry.expiresAt) {
		return nil
	}
	return entry.data
}

func (c *transcriptCache) set(videoID string, data []dto.SubtitleResponseDto, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Simple eviction if cache is full
	if len(c.entries) >= c.maxSize {
		// Remove oldest 10%
		count := 0
		for key := range c.entries {
			delete(c.entries, key)
			count++
			if count >= c.maxSize/10 {
				break
			}
		}
	}

	c.entries[videoID] = &cacheEntry{
		data:      data,
		expiresAt: time.Now().Add(ttl),
	}
}

// ParseURLVideoID extracts video ID from YouTube URL.
func ParseURLVideoID(urlStr string) string {
	if strings.Contains(urlStr, "youtu.be/") {
		parts := strings.Split(urlStr, "youtu.be/")
		if len(parts) > 1 {
			return strings.Split(parts[1], "?")[0]
		}
	}

	u, err := url.Parse(urlStr)
	if err != nil {
		return urlStr
	}

	if v := u.Query().Get("v"); v != "" {
		return v
	}

	return urlStr
}

// subtitleTrack represents a generic subtitle track for selection.
type subtitleTrack struct {
	ID           string // URL or FilePath
	LanguageCode string
	IsASR        bool
}

// prioritizeEnglishTracks returns prioritized track list (Manual > Auto).
func (c *YouTubeTranscriptClient) prioritizeEnglishTracks(tracks []subtitleTrack) []subtitleTrack {
	var manualEng []subtitleTrack
	var autoEng []subtitleTrack

	for _, t := range tracks {
		langToMatch := t.LanguageCode
		if langToMatch == "" {
			// Fallback to testing the ID/URL if lang is empty (happens with Invidious)
			langToMatch = t.ID
		}

		c.logger.Debug("Evaluating track for English", zap.String("candidate", langToMatch), zap.String("id", t.ID), zap.Bool("isASR", t.IsASR))
		if c.englishReg.MatchString(langToMatch) {
			if t.IsASR {
				autoEng = append(autoEng, t)
			} else {
				manualEng = append(manualEng, t)
			}
		}
	}

	c.logger.Debug("English tracks prioritization", zap.Int("manual", len(manualEng)), zap.Int("auto", len(autoEng)))
	return append(manualEng, autoEng...)
}
