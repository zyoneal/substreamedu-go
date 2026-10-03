package com.substreamedu.media.dto.response;

public record LyricsResponseDto(
        String lyrics,
        String source,
        String artist,
        String title) {
}
