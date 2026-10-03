package com.substreamedu.media.service.impl;

import com.substreamedu.media.dto.response.YoutubeVideoDto;
import com.substreamedu.media.dto.response.YoutubeResponseDto;
import com.substreamedu.media.exception.ResourceNotFoundException;
import com.substreamedu.media.service.YoutubeService;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class YoutubeServiceImpl implements YoutubeService {

    private final WebClient.Builder webClientBuilder;

    @Value("${youtube.api.key}")
    private String apiKey;

    private static final String YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";

    @Override
    @Cacheable(value = "youtube-video", key = "#videoId")
    @Retry(name = "youtubeApi")
    @CircuitBreaker(name = "youtubeApi", fallbackMethod = "getVideoInfoFallback")
    public YoutubeVideoDto getVideoInfo(String videoId) {
        log.info("Fetching video info for videoId: {}", videoId);
        return webClientBuilder.build()
                .get()
                .uri(YOUTUBE_API_URL + "/videos?part=snippet,contentDetails,statistics&id=" + videoId + "&key="
                        + apiKey)
                .retrieve()
                .bodyToMono(YoutubeResponseDto.class)
                .map(response -> {
                    if (response.items().isEmpty()) {
                        throw new ResourceNotFoundException("Video not found: " + videoId);
                    }
                    return response.items().get(0);
                })
                .block();
    }

    public YoutubeVideoDto getVideoInfoFallback(String videoId, Throwable t) {
        log.error("Fallback for getVideoInfo videoId: {}. Reason: {}", videoId, t.getMessage());
        return null;
    }

    @Override
    @Cacheable(value = "youtube-search", key = "#query")
    @Retry(name = "youtubeApi")
    @CircuitBreaker(name = "youtubeApi", fallbackMethod = "searchVideosFallback")
    public List<YoutubeVideoDto> searchVideos(String query) {
        log.info("Searching videos for query: {}", query);
        return webClientBuilder.build()
                .get()
                .uri(YOUTUBE_API_URL + "/search?part=snippet&type=video&maxResults=10&q=" + query + "&key=" + apiKey)
                .retrieve()
                .bodyToMono(YoutubeResponseDto.class)
                .map(YoutubeResponseDto::items)
                .block();
    }

    public List<YoutubeVideoDto> searchVideosFallback(String query, Throwable t) {
        log.error("Fallback for searchVideos query: {}. Reason: {}", query, t.getMessage());
        return Collections.emptyList();
    }
}
