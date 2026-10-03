package com.substreamedu.media.service.impl;

import com.substreamedu.media.service.LyricsService;
import com.fasterxml.jackson.databind.JsonNode;
import com.substreamedu.media.dto.response.LyricsResponseDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class LyricsServiceImpl implements LyricsService {

    private final WebClient.Builder webClientBuilder;
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

    @Cacheable(value = "lyrics", key = "#artist.toLowerCase() + ':' + #title.toLowerCase()")
    @Override
    public LyricsResponseDto getLyrics(String artist, String title) {
        String cleanArtist = cleanSearchTerm(artist);
        String cleanTitle = cleanSearchTerm(title);

        LyricsResponseDto result = tryLrcLib(cleanArtist, cleanTitle, artist, title);
        if (result != null)
            return result;

        result = tryLyricsOvh(cleanArtist, cleanTitle, artist, title);
        if (result != null)
            return result;

        result = trySomeRandomApi(cleanArtist, cleanTitle, artist, title);
        if (result != null)
            return result;

        result = tryAZLyrics(cleanArtist, cleanTitle, artist, title);
        if (result != null)
            return result;

        return null;
    }

    private LyricsResponseDto tryLrcLib(String artist, String title, String originalArtist, String originalTitle) {
        try {
            String normalizedArtist = normalizeCharacters(artist);
            String normalizedTitle = normalizeCharacters(title);
            String searchQuery = stripSpecialChars(normalizedArtist) + " " + stripSpecialChars(normalizedTitle);
            String searchUrl = String.format("https://lrclib.net/api/search?q=%s", urlEncode(searchQuery));

            WebClient webClient = webClientBuilder.build();
            JsonNode searchResults = webClient.get()
                    .uri(searchUrl)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(10))
                    .onErrorResume(e -> Mono.empty())
                    .block();

            if (searchResults != null && searchResults.isArray() && searchResults.size() > 0) {
                JsonNode firstResult = searchResults.get(0);
                if (firstResult.has("id")) {
                    int lyricsId = firstResult.get("id").asInt();
                    String getLyricsUrl = "https://lrclib.net/api/get/" + lyricsId;
                    JsonNode lyricsResponse = webClient.get().uri(getLyricsUrl).retrieve().bodyToMono(JsonNode.class)
                            .block();
                    if (lyricsResponse != null && lyricsResponse.has("plainLyrics")) {
                        String lyrics = lyricsResponse.get("plainLyrics").asText();
                        if (lyrics != null && lyrics.length() > 50) {
                            return new LyricsResponseDto(lyrics, "lrclib", originalArtist, originalTitle);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("lrclib.net failed: {}", e.getMessage());
        }
        return null;
    }

    private LyricsResponseDto tryLyricsOvh(String artist, String title, String originalArtist, String originalTitle) {
        try {
            String url = String.format("https://api.lyrics.ovh/v1/%s/%s", urlEncode(artist), urlEncode(title));
            WebClient webClient = webClientBuilder.build();
            JsonNode response = webClient.get().uri(url).retrieve().bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(10)).onErrorResume(e -> Mono.empty()).block();
            if (response != null && response.has("lyrics")) {
                String lyrics = response.get("lyrics").asText();
                if (lyrics != null && lyrics.length() > 50) {
                    return new LyricsResponseDto(lyrics, "lyrics.ovh", originalArtist, originalTitle);
                }
            }
        } catch (Exception e) {
            log.debug("lyrics.ovh failed");
        }
        return null;
    }

    private LyricsResponseDto trySomeRandomApi(String artist, String title, String originalArtist,
            String originalTitle) {
        try {
            String url = String.format("https://some-random-api.com/lyrics?title=%s", urlEncode(title + " " + artist));
            WebClient webClient = webClientBuilder.build();
            JsonNode response = webClient.get().uri(url).retrieve().bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(10)).onErrorResume(e -> Mono.empty()).block();
            if (response != null && response.has("lyrics")) {
                String lyrics = response.get("lyrics").asText();
                if (lyrics != null && lyrics.length() > 50) {
                    return new LyricsResponseDto(lyrics, "some-random-api", originalArtist, originalTitle);
                }
            }
        } catch (Exception e) {
            log.debug("Some Random API failed");
        }
        return null;
    }

    private LyricsResponseDto tryAZLyrics(String artist, String title, String originalArtist, String originalTitle) {
        try {
            String cleanArt = artist.toLowerCase().replaceAll("[^a-z0-9]", "");
            String cleanTit = title.toLowerCase().replaceAll("[^a-z0-9]", "");
            String url = String.format("https://www.azlyrics.com/lyrics/%s/%s.html", cleanArt, cleanTit);
            Document doc = Jsoup.connect(url).userAgent(USER_AGENT).timeout(10000).get();
            Element lyricsDiv = doc.select("div.col-xs-12.col-lg-8.text-center div:not([class])").stream()
                    .filter(div -> div.html().length() > 100 && !div.html().contains("<div")).findFirst().orElse(null);
            if (lyricsDiv != null) {
                String lyrics = lyricsDiv.wholeText().trim();
                if (lyrics.length() > 50)
                    return new LyricsResponseDto(lyrics, "azlyrics", originalArtist, originalTitle);
            }
        } catch (Exception e) {
            log.debug("AZLyrics failed");
        }
        return null;
    }

    private String normalizeCharacters(String text) {
        if (text == null)
            return "";
        return text.replace("\u2019", "'").replace("\u2018", "'").replace("\u201C", "\"").replace("\u201D", "\"")
                .replaceAll("(?i)\\s*-\\s*Topic\\s*$", "").trim();
    }

    private String stripSpecialChars(String text) {
        if (text == null)
            return "";
        return text.replaceAll("[^a-zA-Z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
    }

    private String cleanSearchTerm(String term) {
        if (term == null)
            return "";
        return term.replaceAll("\\s*\\(.*?\\)", "").replaceAll("\\s*\\[.*?\\]", "").trim();
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
