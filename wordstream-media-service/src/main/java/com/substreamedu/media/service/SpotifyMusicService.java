package com.substreamedu.media.service;

import com.substreamedu.media.dto.response.MusicTrackDto;
import java.util.List;

public interface SpotifyMusicService {
    List<MusicTrackDto> searchTracks(String query);

    MusicTrackDto getTrack(String trackId);
}
