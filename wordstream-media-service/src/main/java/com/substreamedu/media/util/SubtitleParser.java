package com.substreamedu.media.util;

import com.substreamedu.media.dto.response.SubtitleResponseDto;
import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringEscapeUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@UtilityClass
public class SubtitleParser {

    private static final Pattern SRT_TIME_PATTERN = Pattern
            .compile("(\\d{2}:\\d{2}:\\d{2},\\d{3}) --> (\\d{2}:\\d{2}:\\d{2},\\d{3})");
    private static final Pattern VTT_TIME_PATTERN = Pattern
            .compile("((?:\\d{2}:)?\\d{2}:\\d{2}\\.\\d{3}) --> ((?:\\d{2}:)?\\d{2}:\\d{2}\\.\\d{3})");

    public static String cleanSubtitleText(String text) {
        if (text == null)
            return "";
        String cleaned = text.replaceAll("<[^>]*>", "");
        cleaned = StringEscapeUtils.unescapeHtml4(cleaned);
        return cleaned.replaceAll("\\s+", " ").trim();
    }

    public static int parseSrtTime(String t) {
        String[] parts = t.split("[:,]");
        return (Integer.parseInt(parts[0]) * 3600 + Integer.parseInt(parts[1]) * 60 + Integer.parseInt(parts[2])) * 1000
                + Integer.parseInt(parts[3]);
    }

    public static int parseVttTime(String t) {
        String[] parts = t.split("[:.]");
        if (parts.length == 4) {
            return Integer.parseInt(parts[0]) * 3600000 + Integer.parseInt(parts[1]) * 60000
                    + Integer.parseInt(parts[2]) * 1000 + Integer.parseInt(parts[3]);
        } else {
            return Integer.parseInt(parts[0]) * 60000 + Integer.parseInt(parts[1]) * 1000 + Integer.parseInt(parts[2]);
        }
    }

    public static List<SubtitleResponseDto> parseVtt(List<String> lines) {
        return parse(lines, true);
    }

    public static List<SubtitleResponseDto> parseSrt(List<String> lines) {
        return parse(lines, false);
    }

    private static List<SubtitleResponseDto> parse(List<String> lines, boolean isVtt) {
        List<SubtitleResponseDto> subs = new ArrayList<>();
        AtomicLong id = new AtomicLong(1);
        String start = null, end = null;
        StringBuilder text = new StringBuilder();
        Pattern timePattern = isVtt ? VTT_TIME_PATTERN : SRT_TIME_PATTERN;

        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty() || (isVtt && line.equals("WEBVTT"))) {
                if (start != null && text.length() > 0) {
                    addSub(subs, id, start, end, text.toString(), isVtt);
                }
                start = null;
                text.setLength(0);
                continue;
            }
            Matcher m = timePattern.matcher(line);
            if (m.find()) {
                if (start != null && text.length() > 0) {
                    addSub(subs, id, start, end, text.toString(), isVtt);
                }
                start = m.group(1);
                end = m.group(2);
                text.setLength(0);
            } else if (start != null) {
                if (text.length() > 0)
                    text.append(" ");
                text.append(line);
            }
        }
        if (start != null && text.length() > 0) {
            addSub(subs, id, start, end, text.toString(), isVtt);
        }
        return subs;
    }

    private static void addSub(List<SubtitleResponseDto> subs, AtomicLong id, String start, String end, String text,
            boolean isVtt) {
        String clean = cleanSubtitleText(text);
        if (clean.isEmpty())
            return;
        int startMs = isVtt ? parseVttTime(start) : parseSrtTime(start);
        int endMs = isVtt ? parseVttTime(end) : parseSrtTime(end);

        subs.add(SubtitleResponseDto.builder()
                .id(id.getAndIncrement())
                .name(isVtt ? "Video Subtitle" : "Srt Subtitle")
                .startTimeMs(startMs)
                .endTimeMs(endMs)
                .text(clean)
                .build());
    }
}
