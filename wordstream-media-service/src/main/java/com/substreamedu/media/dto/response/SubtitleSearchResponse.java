package com.substreamedu.media.dto.response;

import lombok.Builder;
import java.util.List;

@Builder
public record SubtitleSearchResponse(
        boolean status,
        List<SearchResult> results,
        List<SubtitleItem> subtitles) {
    @Builder
    public record SearchResult(
            String imdbId,
            Integer tmdbId,
            String type,
            String name,
            Integer sdId,
            String firstAirDate,
            Integer year) {
    }

    @Builder
    public record SubtitleItem(
            String subtitlesId,
            String name,
            String releaseName,
            String url,
            Integer ratings,
            Integer votes,
            Boolean hi,
            String language,
            String author,
            Integer seasonNumber,
            Integer episodeNumber,
            Integer frameRate,
            String downloadCount,
            String uploadDate) {
    }
}
