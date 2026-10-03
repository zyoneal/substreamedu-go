package com.substreamedu.media.service.impl;

import com.substreamedu.media.service.ExternalSubtitleService;
import com.substreamedu.media.dto.response.SubtitleSearchResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;

@Slf4j
@Service
public class ExternalSubtitleServiceImpl implements ExternalSubtitleService {

    @Value("${subdl.api-key}")
    private String apiKey;

    @Value("${subdl.base-url}")
    private String baseUrl;

    private final WebClient.Builder webClientBuilder;

    public ExternalSubtitleServiceImpl(WebClient.Builder webClientBuilder) {
        this.webClientBuilder = webClientBuilder;
    }

    @Override
    @Cacheable(value = "external-subtitles", key = "#filmName.toLowerCase() + ':' + #languages + ':' + #type")
    public SubtitleSearchResponse searchSubtitles(String filmName, String languages, String type, Integer season,
            Integer episode) {
        try {
            WebClient webClient = webClientBuilder.build();
            String url = String.format("%s/subtitles?api_key=%s&film_name=%s&languages=%s&type=%s",
                    baseUrl, apiKey, encodeValue(filmName), languages, type);
            if (season != null)
                url += "&season_number=" + season;
            if (episode != null)
                url += "&episode_number=" + episode;

            return webClient.get().uri(url).retrieve().bodyToMono(SubtitleSearchResponse.class)
                    .timeout(Duration.ofSeconds(10))
                    .onErrorResume(e -> Mono.just(SubtitleSearchResponse.builder().status(false).build())).block();
        } catch (Exception e) {
            log.error("SubDL search failed", e);
            return SubtitleSearchResponse.builder().status(false).build();
        }
    }

    @Override
    public byte[] downloadSubtitle(String subtitleId) {
        try {
            WebClient webClient = webClientBuilder.build();
            return webClient.get().uri("https://dl.subdl.com/subtitle/" + subtitleId + ".zip")
                    .retrieve().bodyToMono(byte[].class).timeout(Duration.ofSeconds(30)).block();
        } catch (Exception e) {
            throw new RuntimeException("Download failed", e);
        }
    }

    private String encodeValue(String value) {
        try {
            return java.net.URLEncoder.encode(value, "UTF-8");
        } catch (Exception e) {
            return value;
        }
    }
}
