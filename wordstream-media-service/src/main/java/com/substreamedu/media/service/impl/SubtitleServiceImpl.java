package com.substreamedu.media.service.impl;

import com.substreamedu.media.config.YouTubeSubtitleProperties;
import com.substreamedu.media.dto.response.SubtitleDto;
import com.substreamedu.media.dto.response.SubtitleResponseDto;
import com.substreamedu.media.mapper.SubtitleMapper;
import com.substreamedu.media.model.Subtitle;
import com.substreamedu.media.repository.SubtitleRepository;
import com.substreamedu.media.util.SubtitleParser;
import com.substreamedu.media.service.SubtitleService;
import com.substreamedu.media.service.InvidiousSubtitleService;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.thoroldvix.api.TranscriptApiFactory;
import io.github.thoroldvix.api.TranscriptContent;
import io.github.thoroldvix.api.YoutubeTranscriptApi;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubtitleServiceImpl implements SubtitleService {

    private final SubtitleRepository subtitleRepository;
    private final SubtitleMapper subtitleMapper;
    private final YouTubeSubtitleProperties properties;
    private final MeterRegistry meterRegistry;
    private final InvidiousSubtitleService invidiousSubtitleService;

    private YoutubeTranscriptApi transcriptApi;
    private Counter downloadSuccessCounter;
    private Counter downloadFailureCounter;
    private Timer downloadTimer;

    @PostConstruct
    public void init() {
        downloadSuccessCounter = Counter.builder("subtitle.download.success").register(meterRegistry);
        downloadFailureCounter = Counter.builder("subtitle.download.failure").register(meterRegistry);
        downloadTimer = Timer.builder("subtitle.download.duration").register(meterRegistry);
        transcriptApi = TranscriptApiFactory.createDefault();
    }

    @Override
    @Transactional
    public void uploadFile(UUID userId, MultipartFile file) {
        if (subtitleRepository.existsByUserIdAndName(userId, file.getOriginalFilename()))
            return;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            List<String> lines = reader.lines().toList();
            List<SubtitleResponseDto> parsedSubs = SubtitleParser.parseSrt(lines);

            List<Subtitle> subtitles = parsedSubs.stream()
                    .map(dto -> Subtitle.builder()
                            .userId(userId)
                            .name(file.getOriginalFilename())
                            .startTimeMs(dto.startTimeMs())
                            .endTimeMs(dto.endTimeMs())
                            .text(dto.text())
                            .build())
                    .toList();

            subtitleRepository.saveAll(subtitles);
        } catch (Exception e) {
            log.error("Error processing subtitles for user {}", userId, e);
            throw new RuntimeException("Error processing subtitles", e);
        }
    }

    @Override
    public List<String> getSubtitles(UUID userId, String name) {
        return subtitleRepository.findTextsByName(userId, name);
    }

    @Override
    public List<SubtitleDto> getAll(UUID userId) {
        return subtitleRepository.findDistinctSubtitleNames(userId).stream()
                .map(name -> SubtitleDto.builder().name(name).build()).toList();
    }

    @Override
    public List<SubtitleResponseDto> getSubtitlesForVideo(UUID userId, String name) {
        return subtitleRepository.findByUserIdAndNameOrderByStartTimeMs(userId, name).stream()
                .map(subtitleMapper::toResponseDto).toList();
    }

    @Override
    @Transactional
    public void deleteSubtitlesByName(UUID userId, String name) {
        subtitleRepository.deleteByUserIdAndName(userId, name);
    }

    @Override
    @Cacheable(value = "youtube-subtitles", key = "#videoId + '-' + 'en'")
    public List<SubtitleResponseDto> getSubtitlesForYoutubeVideo(String videoId) {
        return getSubtitles(videoId, "en", "en-US", "en-GB");
    }

    @Override
    @Retry(name = "youtube-subtitle")
    @CircuitBreaker(name = "youtube-subtitle", fallbackMethod = "getSubtitlesFallback")
    public List<SubtitleResponseDto> getSubtitles(String videoId, String... languages) {
        return downloadTimer.record(() -> {
            try {
                log.info("Attempting to download subtitles for video: {} in languages: {}", videoId, languages);
                TranscriptContent transcriptContent = transcriptApi.getTranscript(videoId, languages);

                if (transcriptContent == null || transcriptContent.getContent().isEmpty()) {
                    log.warn("No transcript found for {}, trying fallbacks...", videoId);
                    return tryFallbacks(videoId, languages);
                }

                List<SubtitleResponseDto> subs = convertTranscript(transcriptContent);
                downloadSuccessCounter.increment();
                return subs;
            } catch (Exception e) {
                log.warn("Primary download failed for {}, trying fallbacks...", videoId, e.getMessage());
                return tryFallbacks(videoId, languages);
            }
        });
    }

    private List<SubtitleResponseDto> tryFallbacks(String videoId, String[] languages) {
        try {
            List<SubtitleResponseDto> ytDlpSubs = downloadViaYtDlp(videoId, languages);
            if (!ytDlpSubs.isEmpty()) {
                downloadSuccessCounter.increment();
                return ytDlpSubs;
            }
        } catch (Exception ex) {
            log.error("yt-dlp fallback failed for {}", videoId, ex.getMessage());
        }

        try {
            List<SubtitleResponseDto> invidiousSubs = invidiousSubtitleService.getSubtitles(videoId, languages);
            if (!invidiousSubs.isEmpty()) {
                downloadSuccessCounter.increment();
                return invidiousSubs;
            }
        } catch (Exception ex) {
            log.error("Invidious fallback failed for {}", videoId, ex.getMessage());
        }

        downloadFailureCounter.increment();
        return Collections.emptyList();
    }

    public List<SubtitleResponseDto> getSubtitlesFallback(String videoId, String[] languages, Throwable t) {
        log.error("Circuit breaker opened or retry failed for subtitles of {}. Reason: {}", videoId, t.getMessage());
        return Collections.emptyList();
    }

    private List<SubtitleResponseDto> convertTranscript(TranscriptContent content) {
        AtomicLong idCounter = new AtomicLong(1);
        return content.getContent().stream().map(fragment -> SubtitleResponseDto.builder()
                .id(idCounter.getAndIncrement()).name("YouTube")
                .startTimeMs((int) (fragment.getStart() * 1000))
                .endTimeMs((int) ((fragment.getStart() + fragment.getDur()) * 1000))
                .text(SubtitleParser.cleanSubtitleText(fragment.getText())).build())
                .filter(dto -> !dto.text().isEmpty()).toList();
    }

    private List<SubtitleResponseDto> downloadViaYtDlp(String videoId, String[] languages)
            throws IOException, InterruptedException {
        Path tempDir = Files.createTempDirectory("yt-dlp-subs-" + videoId);
        try {
            ProcessBuilder pb = new ProcessBuilder("yt-dlp", "--write-subs", "--write-auto-sub",
                    "--sub-lang", String.join(",", languages), "--skip-download", "--output", "subs",
                    "https://www.youtube.com/watch?v=" + videoId);
            pb.directory(tempDir.toFile());

            Process process = pb.start();
            boolean finished = process.waitFor(30, TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                throw new IOException("yt-dlp timed out for video " + videoId);
            }

            if (process.exitValue() != 0) {
                throw new IOException("yt-dlp exited with code " + process.exitValue());
            }

            try (Stream<Path> walk = Files.list(tempDir)) {
                Path vttFile = walk.filter(p -> p.toString().endsWith(".vtt"))
                        .findFirst()
                        .orElseThrow(() -> new IOException("No VTT file found for video " + videoId));
                return SubtitleParser.parseVtt(Files.readAllLines(vttFile));
            }
        } finally {
            deleteDirectory(tempDir);
        }
    }

    private void deleteDirectory(Path directory) {
        try {
            if (Files.exists(directory)) {
                try (Stream<Path> walk = Files.walk(directory)) {
                    walk.sorted(Comparator.reverseOrder())
                            .map(Path::toFile)
                            .forEach(file -> {
                                if (!file.delete()) {
                                    log.warn("Failed to delete file: {}", file.getAbsolutePath());
                                }
                            });
                }
            }
        } catch (IOException e) {
            log.warn("Failed to walk and delete directory: {}", directory, e.getMessage());
        }
    }
}
