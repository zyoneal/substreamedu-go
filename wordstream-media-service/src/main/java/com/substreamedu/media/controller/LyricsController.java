package com.substreamedu.media.controller;

import com.substreamedu.media.dto.response.ApiResponse;
import com.substreamedu.media.dto.response.LyricsResponseDto;
import com.substreamedu.media.exception.ResourceNotFoundException;
import com.substreamedu.media.service.LyricsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/lyrics")
@RequiredArgsConstructor
public class LyricsController {

    private final LyricsService lyricsService;

    @GetMapping
    public ApiResponse<LyricsResponseDto> getLyrics(
            @RequestParam String artist,
            @RequestParam String title) {
        log.info("Lyrics request for {} - {}", artist, title);
        LyricsResponseDto lyrics = lyricsService.getLyrics(artist, title);
        if (lyrics == null) {
            throw new ResourceNotFoundException("Lyrics not found for " + artist + " - " + title);
        }
        return ApiResponse.success(lyrics);
    }

}
