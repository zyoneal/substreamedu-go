package com.substreamedu.media.controller;

import com.substreamedu.media.dto.response.ApiResponse;
import com.substreamedu.media.dto.response.MusicTrackDto;
import com.substreamedu.media.service.SpotifyMusicService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/music")
@RequiredArgsConstructor
public class MusicController {

    private final SpotifyMusicService spotifyMusicService;

    @GetMapping("/search")
    public ApiResponse<List<MusicTrackDto>> searchMusic(
            @RequestParam String query) {
        log.info("Music search request: query='{}'", query);
        return ApiResponse.success(spotifyMusicService.searchTracks(query));
    }

}
