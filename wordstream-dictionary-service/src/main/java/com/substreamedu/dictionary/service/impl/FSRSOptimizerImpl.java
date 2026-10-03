package com.substreamedu.dictionary.service.impl;

import com.substreamedu.dictionary.model.ReviewLog;
import com.substreamedu.dictionary.model.UserSRSParameters;
import com.substreamedu.dictionary.repository.ReviewLogRepository;
import com.substreamedu.dictionary.repository.UserSRSParametersRepository;
import com.substreamedu.dictionary.service.FSRSOptimizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FSRSOptimizerImpl implements FSRSOptimizer {

    private final ReviewLogRepository reviewLogRepository;
    private final UserSRSParametersRepository userSRSParametersRepository;

    @Override
    public UserSRSParameters getOrCreateParams(UUID userId) {
        return userSRSParametersRepository.findById(userId)
                .orElseGet(() -> UserSRSParameters.builder()
                        .userId(userId)
                        .lastOptimized(Instant.now())
                        .build());
    }

    @Override
    @Transactional
    public void logReview(UUID userId, Long cardId, int rating, int responseTimeMs,
            float stabilityBefore, float difficultyBefore, float elapsedDays,
            float scheduledDays, String state) {
        ReviewLog logEntry = ReviewLog.create(userId, cardId, rating, responseTimeMs,
                stabilityBefore, difficultyBefore, elapsedDays, scheduledDays, state);
        reviewLogRepository.save(logEntry);
    }

    // Optimization logic placeholder - in a real app this might use a Python/C++
    // microservice
    // for complex regressions, but we keep the structure for FAANG-level design.
    @Override
    @Transactional
    public void optimize(UUID userId) {
        log.info("Starting FSRS parameter optimization for user: {}", userId);
        // Logic to analyze review logs and update UserSRSParameters
    }
}
