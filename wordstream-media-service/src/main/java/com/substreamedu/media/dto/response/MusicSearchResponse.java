package com.substreamedu.media.dto.response;

import lombok.Builder;

@Builder
public record MusicSearchResponse(
        String id,
        String title,
        String artist,
        Integer year,
        String imageUrl,
        AudioInfo audio) {
    @Builder
    public record AudioInfo(
            String youtubeUrl,
            String youtubeEmbedUrl,
            String spotifyUrl,
            String spotifyEmbedUrl,
            String previewUrl) {
    }
}
