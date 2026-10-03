package com.substreamedu.media.service;

import com.substreamedu.media.dto.response.SubtitleResponseDto;
import java.util.List;

public interface InvidiousSubtitleService {
    List<SubtitleResponseDto> getSubtitles(String videoId, String[] languages);
}
