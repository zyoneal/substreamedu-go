package com.substreamedu.media.controller;

import com.substreamedu.media.dto.response.ApiResponse;
import com.substreamedu.media.dto.response.SubtitleDto;
import com.substreamedu.media.dto.response.SubtitleResponseDto;
import com.substreamedu.media.dto.response.SubtitleSearchResponse;
import com.substreamedu.media.service.ExternalSubtitleService;
import com.substreamedu.media.service.SubtitleService;
import com.substreamedu.media.exception.MediaException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/subtitles")
@RequiredArgsConstructor
@Validated
public class SubtitleController {

    private final SubtitleService subtitleService;
    private final ExternalSubtitleService externalSubtitleService;

    private UUID getUserId(String userIdHeader) {
        if (userIdHeader == null || "undefined".equals(userIdHeader) || "null".equals(userIdHeader)
                || userIdHeader.isEmpty()) {
            throw new MediaException("Unauthorized: User context missing", HttpStatus.UNAUTHORIZED);
        }
        try {
            return UUID.fromString(userIdHeader);
        } catch (IllegalArgumentException e) {
            throw new MediaException("Unauthorized: Invalid user context format", HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<Void> uploadFile(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestParam("file") MultipartFile file) {
        UUID userId = getUserId(userIdHeader);
        log.info("User {} uploading subtitle file: {}", userId, file.getOriginalFilename());
        subtitleService.uploadFile(userId, file);
        return ApiResponse.success("File uploaded successfully", null);
    }

    @GetMapping("/{name}")
    public ApiResponse<List<String>> getSubtitles(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable("name") String name) {
        return ApiResponse.success(subtitleService.getSubtitles(getUserId(userIdHeader), name));
    }

    @DeleteMapping("/{name}")
    public ApiResponse<Void> deleteSubtitle(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable("name") String name) {
        subtitleService.deleteSubtitlesByName(getUserId(userIdHeader), name);
        return ApiResponse.success("Subtitle deleted successfully", null);
    }

    @GetMapping("/video/{name}")
    public ApiResponse<List<SubtitleResponseDto>> getSubtitlesForVideo(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable("name") String name) {
        return ApiResponse.success(subtitleService.getSubtitlesForVideo(getUserId(userIdHeader), name));
    }

    @GetMapping("/youtube/{videoId}")
    public ApiResponse<List<SubtitleResponseDto>> getSubtitlesForYoutubeVideo(@PathVariable("videoId") String videoId) {
        return ApiResponse.success(subtitleService.getSubtitlesForYoutubeVideo(videoId));
    }

    @GetMapping
    public ApiResponse<List<SubtitleDto>> getAllSubtitles(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {
        return ApiResponse.success(subtitleService.getAll(getUserId(userIdHeader)));
    }

    @GetMapping("/external/search")
    public ApiResponse<SubtitleSearchResponse> searchExternalSubtitles(
            @RequestParam String filmName,
            @RequestParam(defaultValue = "EN") String languages,
            @RequestParam(defaultValue = "movie") String type,
            @RequestParam(required = false) Integer seasonNumber,
            @RequestParam(required = false) Integer episodeNumber) {
        return ApiResponse.success(
                externalSubtitleService.searchSubtitles(filmName, languages, type, seasonNumber, episodeNumber));
    }

    @GetMapping("/external/download/{subtitleId}")
    public ResponseEntity<byte[]> downloadExternalSubtitle(@PathVariable String subtitleId) {
        log.info("Downloading external subtitle: {}", subtitleId);
        byte[] content = externalSubtitleService.downloadSubtitle(subtitleId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "application/zip")
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"subtitle-" + subtitleId + ".zip\"")
                .body(content);
    }

}
