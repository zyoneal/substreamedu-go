package service

import (
	"context"

	"github.com/substreamedu/substreamedu-media-service/internal/client"
	"github.com/substreamedu/substreamedu-media-service/internal/dto"
	"go.uber.org/zap"
)

type MusicService struct {
	spotifyClient	*client.SpotifyClient
	logger		*zap.Logger
}

func NewMusicService(spotifyClient *client.SpotifyClient, logger *zap.Logger) *MusicService {
	return &MusicService{
		spotifyClient:	spotifyClient,
		logger:		logger,
	}
}

func (s *MusicService) SearchTracks(ctx context.Context, query string) ([]dto.MusicTrackDto, error) {
	return s.spotifyClient.SearchTracks(ctx, query)
}
