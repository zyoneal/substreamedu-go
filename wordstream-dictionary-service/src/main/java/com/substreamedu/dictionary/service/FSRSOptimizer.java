package com.substreamedu.dictionary.service;

import com.substreamedu.dictionary.model.UserSRSParameters;
import java.util.UUID;

public interface FSRSOptimizer {
    UserSRSParameters getOrCreateParams(UUID userId);

    void logReview(UUID userId, Long cardId, int rating, int responseTimeMs,
            float stabilityBefore, float difficultyBefore, float elapsedDays,
            float scheduledDays, String state);

    void optimize(UUID userId);
}
