package com.substreamedu.media.service;

import com.substreamedu.media.dto.response.LyricsResponseDto;

public interface LyricsService {
    LyricsResponseDto getLyrics(String artist, String title);
}
