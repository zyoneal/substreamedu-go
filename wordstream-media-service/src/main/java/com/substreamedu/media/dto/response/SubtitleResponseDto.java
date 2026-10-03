package com.substreamedu.media.dto.response;

import lombok.Builder;

@Builder
public record SubtitleResponseDto(
        Long id,
        String name,
        Integer startTimeMs,
        Integer endTimeMs,
        String text) {
}
