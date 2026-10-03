package com.substreamedu.notification.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record DictionaryItemResponse(
        Long id,
        UUID userId,
        String resourceName,
        String highlightedText,
        String translatedText,
        String context,
        String extendedContext,
        String note,
        Instant createdOn,
        String status,
        int repetitionLevel,
        LocalDate nextRepetitionDate,
        String transcription,
        String definition,
        String imageUrl,
        float difficultyScore) {
}
