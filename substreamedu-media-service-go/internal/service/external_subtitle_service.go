package service

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/substreamedu/substreamedu-media-service/internal/client"
	"github.com/substreamedu/substreamedu-media-service/internal/dto"
	"go.uber.org/zap"
)

type ExternalSubtitleService struct {
	subDLClient	*client.SubDLClient
	logger		*zap.Logger
}

func NewExternalSubtitleService(subDLClient *client.SubDLClient, logger *zap.Logger) *ExternalSubtitleService {
	return &ExternalSubtitleService{
		subDLClient:	subDLClient,
		logger:		logger,
	}
}

func (s *ExternalSubtitleService) SearchSubtitles(ctx context.Context, filmName, languages, filmType string, season, episode, year *int, imdbId, tmdbId *string, sdId *int) (*dto.SubtitleSearchResponse, error) {
	s.logger.Info("Searching external subtitles",
		zap.String("filmName", filmName),
		zap.String("type", filmType),
		zap.Any("season", season),
		zap.Any("episode", episode),
		zap.Any("year", year),
		zap.Any("imdbId", imdbId),
		zap.Any("tmdbId", tmdbId),
		zap.Any("sdId", sdId))

	raw, err := s.subDLClient.SearchSubtitles(ctx, filmName, languages, filmType, season, episode, year, imdbId, tmdbId, sdId)
	if err != nil {
		s.logger.Error("failed to search subdl", zap.Error(err))

		return &dto.SubtitleSearchResponse{
			Status:		false,
			Results:	[]dto.SearchResult{},
			Subtitles:	[]dto.SubtitleItem{},
		}, nil
	}

	// If a specific year was requested and multiple results were returned:
	if year != nil && *year > 1900 && len(raw.Results) > 1 {
		var matchingResult *dto.SubDLSearchResult
		for i := range raw.Results {
			if raw.Results[i].Year == *year {
				matchingResult = &raw.Results[i]
				break
			}
		}

		if matchingResult != nil {
			// If the matching result isn't first, move it to the top of raw.Results
			// and fetch subtitles for this specific sdId if top result didn't match the year
			if raw.Results[0].Year != *year && matchingResult.SdID != 0 {
				s.logger.Info("Target year differs from top SubDL result, querying subtitles by sd_id for matching year",
					zap.Int("expectedYear", *year),
					zap.Int("topYear", raw.Results[0].Year),
					zap.Int("sdId", matchingResult.SdID))
				specificRaw, err := s.subDLClient.SearchSubtitles(ctx, "", languages, filmType, season, episode, year, nil, nil, &matchingResult.SdID)
				if err == nil && len(specificRaw.Subtitles) > 0 {
					raw.Subtitles = specificRaw.Subtitles
				}
			}

			// Prioritize the matching year in results
			var prioritized []dto.SubDLSearchResult
			prioritized = append(prioritized, *matchingResult)
			for _, r := range raw.Results {
				if r.SdID != matchingResult.SdID {
					prioritized = append(prioritized, r)
				}
			}
			raw.Results = prioritized
		}
	}

	res := &dto.SubtitleSearchResponse{
		Status:		raw.Status,
		Results:	make([]dto.SearchResult, 0),
		Subtitles:	make([]dto.SubtitleItem, 0),
	}

	for _, r := range raw.Results {
		res.Results = append(res.Results, dto.SearchResult{
			ImdbID:		r.ImdbID,
			TmdbID:		r.TmdbID,
			Type:		r.Type,
			Name:		r.Name,
			SdID:		r.SdID,
			FirstAirDate:	r.FirstAirDate,
			Year:		r.Year,
		})
	}

	for _, sub := range raw.Subtitles {

		if filmType == "tv" && season != nil && episode != nil {

			if sub.SeasonNumber != *season || sub.EpisodeNumber != *episode {
				continue
			}
		}

		sid := ""
		if sub.SubtitleID.String() != "" && sub.SubtitleID.String() != "0" {
			sid = sub.SubtitleID.String()
		} else if sub.ID.String() != "" && sub.ID.String() != "0" {
			sid = sub.ID.String()
		}

		if sid == "" || sid == "0" && sub.URL != "" {

			start := strings.LastIndex(sub.URL, "/")
			end := strings.LastIndex(sub.URL, ".")
			if start != -1 && end != -1 && end > start+1 {
				extractedID := sub.URL[start+1 : end]
				if extractedID != "" {
					sid = extractedID
					s.logger.Info("Extracted subtitle ID from URL", zap.String("sid", sid), zap.String("url", sub.URL))
				}
			}
		}

		if sid == "" || sid == "0" {
			s.logger.Warn("Failed to find valid Subtitle ID for item", zap.String("name", sub.Name), zap.String("url", sub.URL))

			sid = "0"
		}

		res.Subtitles = append(res.Subtitles, dto.SubtitleItem{
			SubtitlesID:	sid,
			Name:		sub.Name,
			ReleaseName:	sub.ReleaseName,
			URL:		sub.URL,
			Ratings:	sub.Ratings,
			Votes:		sub.Votes,
			HI:		sub.HI,
			Language:	sub.Language,
			Author:		sub.Author,
			SeasonNumber:	sub.SeasonNumber,
			EpisodeNumber:	sub.EpisodeNumber,
			FrameRate:	sub.FrameRate,
			DownloadCount:	sub.DownloadCount,
			UploadDate:	sub.UploadDate,
		})
	}

	s.logger.Info("External subtitle search completed",
		zap.Int("resultsCount", len(res.Results)),
		zap.Int("subtitlesCount", len(res.Subtitles)))

	return res, nil
}

var sharedDownloadClient = &http.Client{
	Timeout:	60 * time.Second,
	Transport: &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			dialer := &net.Dialer{
				Timeout:	10 * time.Second,
				KeepAlive:	30 * time.Second,
			}

			return dialer.DialContext(ctx, "tcp4", addr)
		},
		ForceAttemptHTTP2:	true,
		MaxIdleConns:		100,
		IdleConnTimeout:	90 * time.Second,
		TLSHandshakeTimeout:	10 * time.Second,
		ExpectContinueTimeout:	1 * time.Second,
	},
}

func (s *ExternalSubtitleService) DownloadSubtitle(ctx context.Context, subtitleID string) ([]byte, error) {

	url := "https://dl.subdl.com/subtitle/" + subtitleID + ".zip"

	s.logger.Info("Downloading external subtitle zip", zap.String("id", subtitleID), zap.String("url", url))

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/zip, application/octet-stream, */*")
	req.Header.Set("Referer", "https://subdl.com/")

	resp, err := sharedDownloadClient.Do(req)
	if err != nil {
		s.logger.Error("failed to call subdl download", zap.Error(err), zap.String("url", url))
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		s.logger.Error("subdl download failed", zap.Int("statusCode", resp.StatusCode), zap.String("status", resp.Status), zap.String("url", url))
		return nil, fmt.Errorf("download failed: %s", resp.Status)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	s.logger.Info("External subtitle downloaded successfully", zap.Int("size", len(data)))
	return data, nil
}
