package com.substreamedu.media.service;

import com.substreamedu.media.dto.response.SubtitleDto;
import com.substreamedu.media.dto.response.SubtitleResponseDto;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface SubtitleService {
    void uploadFile(UUID userId, MultipartFile file);

    List<String> getSubtitles(UUID userId, String name);

    List<SubtitleDto> getAll(UUID userId);

    List<SubtitleResponseDto> getSubtitlesForVideo(UUID userId, String name);

    void deleteSubtitlesByName(UUID userId, String name);

    List<SubtitleResponseDto> getSubtitlesForYoutubeVideo(String videoId);

    List<SubtitleResponseDto> getSubtitles(String videoId, String... languages);
}
