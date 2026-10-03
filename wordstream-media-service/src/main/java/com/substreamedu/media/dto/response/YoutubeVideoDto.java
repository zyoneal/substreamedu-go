package com.substreamedu.media.dto.response;

public record YoutubeVideoDto(
        String videoId,
        String title,
        String description,
        String thumbnailUrl) {
}
