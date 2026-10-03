package com.substreamedu.dictionary.dto.response;

import lombok.Builder;
import java.time.Instant;
import java.time.LocalDate;

@Builder
public record DictionaryItemDto(
        Long id,
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

        // FSRS fields
        float interval,
        float easeFactor,
        int hardCount,
        int lapses,
        int learningStep,
        Instant learningDue,
        LocalDate lastReviewed,
        int totalReviews,
        int correctReviews,
        float retentionRate,
        int avgReviewDuration,
        float difficultyScore) {
}
