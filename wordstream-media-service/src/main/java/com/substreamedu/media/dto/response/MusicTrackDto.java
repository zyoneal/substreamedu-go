package com.substreamedu.media.dto.response;

import lombok.Builder;

@Builder
public record MusicTrackDto(
        String id,
        String title,
        String artist,
        String album,
        Integer durationMs,
        String previewUrl,
        String imageUrl,
        String externalUrl) {
}
