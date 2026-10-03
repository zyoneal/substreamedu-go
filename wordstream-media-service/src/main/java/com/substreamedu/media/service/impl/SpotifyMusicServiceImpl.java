package com.substreamedu.media.service.impl;

import com.substreamedu.media.dto.response.MusicTrackDto;
import com.substreamedu.media.service.SpotifyMusicService;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpotifyMusicServiceImpl implements SpotifyMusicService {

    private final WebClient.Builder webClientBuilder;

    @Value("${spotify.client-id}")
    private String clientId;

    @Value("${spotify.client-secret}")
    private String clientSecret;

    private static final String SPOTIFY_AUTH_URL = "https://accounts.spotify.com/api/token";
    private static final String SPOTIFY_API_URL = "https://api.spotify.com/v1";

    private String accessToken;

    private Mono<String> getAccessToken() {
        if (accessToken != null) {
            return Mono.just(accessToken);
        }
        return webClientBuilder.build()
                .post()
                .uri(SPOTIFY_AUTH_URL)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .bodyValue("grant_type=client_credentials&client_id=" + clientId + "&client_secret=" + clientSecret)
                .retrieve()
                .bodyToMono(Map.class)
                .map(response -> {
                    accessToken = (String) response.get("access_token");
                    return accessToken;
                });
    }

    @Override
    @Cacheable(value = "spotify-search", key = "#query")
    @Retry(name = "spotifyApi")
    @CircuitBreaker(name = "spotifyApi", fallbackMethod = "searchTracksFallback")
    public List<MusicTrackDto> searchTracks(String query) {
        log.info("Searching tracks on Spotify for query: {}", query);
        return getAccessToken()
                .flatMap(token -> webClientBuilder.build()
                        .get()
                        .uri(SPOTIFY_API_URL + "/search?type=track&q=" + query)
                        .headers(h -> h.setBearerAuth(token))
                        .retrieve()
                        .bodyToMono(Map.class))
                .map(this::parseSearchResponse)
                .block();
    }

    public List<MusicTrackDto> searchTracksFallback(String query, Throwable t) {
        log.error("Fallback for searchTracks query: {}. Reason: {}", query, t.getMessage());
        return Collections.emptyList();
    }

    @Override
    @Cacheable(value = "spotify-track", key = "#trackId")
    @Retry(name = "spotifyApi")
    @CircuitBreaker(name = "spotifyApi", fallbackMethod = "getTrackFallback")
    public MusicTrackDto getTrack(String trackId) {
        log.info("Fetching track info from Spotify for trackId: {}", trackId);
        return getAccessToken()
                .flatMap(token -> webClientBuilder.build()
                        .get()
                        .uri(SPOTIFY_API_URL + "/tracks/" + trackId)
                        .headers(h -> h.setBearerAuth(token))
                        .retrieve()
                        .bodyToMono(Map.class))
                .map(this::parseTrackResponse)
                .block();
    }

    public MusicTrackDto getTrackFallback(String trackId, Throwable t) {
        log.error("Fallback for getTrack trackId: {}. Reason: {}", trackId, t.getMessage());
        return null;
    }

    private List<MusicTrackDto> parseSearchResponse(Map<String, Object> response) {
        Map<String, Object> tracks = (Map<String, Object>) response.get("tracks");
        List<Map<String, Object>> items = (List<Map<String, Object>>) tracks.get("items");
        return items.stream().map(this::parseTrackResponse).toList();
    }

    private MusicTrackDto parseTrackResponse(Map<String, Object> item) {
        List<Map<String, Object>> artists = (List<Map<String, Object>>) item.get("artists");
        String artistName = artists.isEmpty() ? "Unknown" : (String) artists.get(0).get("name");
        Map<String, Object> album = (Map<String, Object>) item.get("album");
        List<Map<String, Object>> images = (List<Map<String, Object>>) album.get("images");
        String imageUrl = images.isEmpty() ? null : (String) images.get(0).get("url");

        return MusicTrackDto.builder()
                .id((String) item.get("id"))
                .title((String) item.get("name"))
                .artist(artistName)
                .album((String) album.get("name"))
                .durationMs((Integer) item.get("duration_ms"))
                .previewUrl((String) item.get("preview_url"))
                .imageUrl(imageUrl)
                .externalUrl((String) ((Map<String, Object>) item.get("external_urls")).get("spotify"))
                .build();
    }
}
