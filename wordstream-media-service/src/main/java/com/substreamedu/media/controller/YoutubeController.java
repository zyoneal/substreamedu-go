package com.substreamedu.media.controller;

import com.substreamedu.media.dto.response.ApiResponse;
import com.substreamedu.media.dto.response.YoutubeVideoDto;
import com.substreamedu.media.service.YoutubeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/youtube")
@RequiredArgsConstructor
@Validated
public class YoutubeController {

    private final YoutubeService youtubeService;

    @GetMapping("/info")
    public ApiResponse<YoutubeVideoDto> getVideoInfo(@RequestParam String videoId) {
        log.info("Fetching video info for ID: {}", videoId);
        return ApiResponse.success(youtubeService.getVideoInfo(videoId));
    }

    @GetMapping("/search")
    public ApiResponse<java.util.List<YoutubeVideoDto>> searchVideos(@RequestParam String query) {
        log.info("Searching videos for query: {}", query);
        return ApiResponse.success(youtubeService.searchVideos(query));
    }

}
