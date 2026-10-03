package com.substreamedu.dictionary.dto.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record WordReviewedEvent(
        UUID userId,
        Long wordId,
        String rating,
        LocalDateTime timestamp) {
}
