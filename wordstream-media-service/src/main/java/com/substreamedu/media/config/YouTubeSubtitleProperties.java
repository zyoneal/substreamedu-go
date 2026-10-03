package com.substreamedu.media.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "youtube.subtitle")
public class YouTubeSubtitleProperties {
    private String defaultLanguage = "en";
    private int cacheDurationHours = 24;
}
