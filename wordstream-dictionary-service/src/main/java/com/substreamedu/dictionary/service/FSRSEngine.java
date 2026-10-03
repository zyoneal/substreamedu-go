package com.substreamedu.dictionary.service;

import com.substreamedu.dictionary.model.Dictionary;
import com.substreamedu.dictionary.model.UserSRSParameters;
import java.time.Instant;
import java.time.LocalDate;

public interface FSRSEngine {
    void setPersonalizedParams(UserSRSParameters params);

    void clearPersonalizedParams();

    ReviewResult review(Dictionary card, UserRating rating, int responseTimeMs);

    ReviewResult reviewLearningCard(Dictionary card, UserRating rating, int responseTimeMs);

    boolean isLearningCard(Dictionary card);

    double calculateRetrievability(Dictionary card, LocalDate today);

    enum UserRating {
        FORGOT, REMEMBER
    }

    record ReviewResult(int nextIntervalDays, boolean repeatInSession, float newStability, Instant learningDue,
            int learningStep) {
        public ReviewResult(int nextIntervalDays, boolean repeatInSession, float newStability) {
            this(nextIntervalDays, repeatInSession, newStability, null, -1);
        }
    }
}
