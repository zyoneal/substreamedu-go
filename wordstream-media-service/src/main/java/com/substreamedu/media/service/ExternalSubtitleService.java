package com.substreamedu.media.service;

import com.substreamedu.media.dto.response.SubtitleSearchResponse;

public interface ExternalSubtitleService {
    SubtitleSearchResponse searchSubtitles(String filmName, String languages, String type, Integer season,
            Integer episode);

    byte[] downloadSubtitle(String subtitleId);
}
