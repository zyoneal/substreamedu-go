package com.substreamedu.media.service.impl;

import com.substreamedu.media.dto.response.SubtitleResponseDto;
import com.substreamedu.media.service.InvidiousSubtitleService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
public class InvidiousSubtitleServiceImpl implements InvidiousSubtitleService {

    private final WebClient webClient;
    private final List<String> invidiousInstances = List.of(
            "https://invidious.snopyta.org",
            "https://yewtu.be",
            "https://invidious.kavin.rocks",
            "https://vid.puffyan.us");

    public InvidiousSubtitleServiceImpl(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    @Override
    public List<SubtitleResponseDto> getSubtitles(String videoId, String[] languages) {
        for (String instance : invidiousInstances) {
            try {
                List<SubtitleResponseDto> subs = fetchFromInstance(instance, videoId, languages);
                if (!subs.isEmpty())
                    return subs;
            } catch (Exception e) {
                log.warn("Failed to fetch from Invidious instance {}: {}", instance, e.getMessage());
            }
        }
        return Collections.emptyList();
    }

    private List<SubtitleResponseDto> fetchFromInstance(String instance, String videoId, String[] languages) {
        String lang = languages.length > 0 ? languages[0] : "en";
        String url = String.format("%s/api/v1/captions/%s?label=%s", instance, videoId, lang);

        log.info("Fetching subtitles from Invidious: {}", url);

        List<Map<String, Object>> response = webClient.get()
                .uri(url)
                .retrieve()
                .bodyToFlux(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                })
                .collectList()
                .timeout(Duration.ofSeconds(5))
                .onErrorResume(e -> Mono.empty())
                .block();

        if (response == null || response.isEmpty())
            return Collections.emptyList();

        List<SubtitleResponseDto> result = new ArrayList<>();
        AtomicLong idCounter = new AtomicLong(1);

        for (Map<String, Object> entry : response) {
            try {
                double start = ((Number) entry.get("start")).doubleValue();
                double duration = ((Number) entry.get("duration")).doubleValue();
                String text = (String) entry.get("text");

                result.add(SubtitleResponseDto.builder()
                        .id(idCounter.getAndIncrement())
                        .name("Invidious (" + lang + ")")
                        .startTimeMs((int) (start * 1000))
                        .endTimeMs((int) ((start + duration) * 1000))
                        .text(text)
                        .build());
            } catch (Exception e) {
                log.warn("Error parsing Invidious subtitle entry: {}", e.getMessage());
            }
        }

        return result;
    }
}
