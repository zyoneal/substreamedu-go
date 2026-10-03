package com.substreamedu.media.service;

import com.substreamedu.media.dto.response.YoutubeVideoDto;
import java.util.List;

public interface YoutubeService {
    YoutubeVideoDto getVideoInfo(String videoId);

    List<YoutubeVideoDto> searchVideos(String query);
}
