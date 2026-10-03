package com.substreamedu.dictionary.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "review_log")
public class ReviewLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "card_id", nullable = false)
    private Long cardId;

    @Column(name = "reviewed_at", nullable = false)
    private Instant reviewedAt;

    @Column(name = "rating", nullable = false)
    private int rating;

    @Column(name = "response_time_ms", nullable = false)
    private int responseTimeMs;

    @Column(name = "stability_before", nullable = false)
    private float stabilityBefore;

    @Column(name = "difficulty_before", nullable = false)
    private float difficultyBefore;

    @Column(name = "elapsed_days", nullable = false)
    private float elapsedDays;

    @Column(name = "scheduled_days", nullable = false)
    private float scheduledDays;

    @Column(name = "state", nullable = false)
    private String state;

    public static ReviewLog create(UUID userId, Long cardId, int rating,
            int responseTimeMs, float stabilityBefore, float difficultyBefore,
            float elapsedDays, float scheduledDays, String state) {
        return ReviewLog.builder()
                .userId(userId)
                .cardId(cardId)
                .reviewedAt(Instant.now())
                .rating(rating)
                .responseTimeMs(responseTimeMs)
                .stabilityBefore(stabilityBefore)
                .difficultyBefore(difficultyBefore)
                .elapsedDays(elapsedDays)
                .scheduledDays(scheduledDays)
                .state(state)
                .build();
    }
}
