package com.substreamedu.dictionary.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "dictionary")
public class Dictionary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "resource_name", nullable = false)
    private String resourceName;

    @Column(name = "highlighted_text", nullable = false, columnDefinition = "TEXT")
    private String highlightedText;

    @Column(name = "translated_text", columnDefinition = "TEXT")
    private String translatedText;

    @Column(name = "context", columnDefinition = "TEXT")
    private String context;

    @Column(name = "extended_context", columnDefinition = "TEXT")
    private String extendedContext;

    @Column(name = "note")
    private String note;

    @CreationTimestamp
    @Column(name = "created_on", updatable = false)
    private Instant createdOn;

    @Column(name = "repetition_level")
    private int repetitionLevel = 0;

    @Column(name = "status")
    private String status = "new";

    @Column(name = "consecutive_success")
    private int consecutiveSuccess = 0;

    @Column(name = "next_repetition_date")
    private LocalDate nextRepetitionDate;

    private String transcription;

    private String definition;

    private String imageUrl;

    @Column(name = "interval", nullable = false)
    private float interval = 0;

    @Column(name = "ease_factor", nullable = false)
    private float easeFactor = 2.5f;

    @Column(name = "hard_count", nullable = false)
    private int hardCount = 0;

    @Column(name = "lapses", nullable = false)
    private int lapses = 0;

    @Column(name = "learning_step", nullable = false)
    private int learningStep = 0;

    @Column(name = "learning_due")
    private Instant learningDue;

    @Column(name = "last_reviewed")
    private LocalDate lastReviewed;

    @Column(name = "total_reviews", nullable = false)
    private int totalReviews = 0;

    @Column(name = "correct_reviews", nullable = false)
    private int correctReviews = 0;

    @Column(name = "retention_rate", nullable = false)
    private float retentionRate = 0.0f;

    @Column(name = "avg_review_duration", nullable = false)
    private int avgReviewDuration = 0;

    @Column(name = "best_review_time")
    private LocalTime bestReviewTime;

    @Column(name = "difficulty_score", nullable = false)
    private float difficultyScore = 0.0f;

    public void incrementHardCount() {
        this.hardCount++;
    }

    public void resetHardCount() {
        this.hardCount = 0;
    }

    public void incrementLapses() {
        this.lapses++;
    }

    public void resetConsecutiveSuccess() {
        this.consecutiveSuccess = 0;
    }

    public void incrementConsecutiveSuccess() {
        this.consecutiveSuccess++;
    }

    public void incrementTotalReviews() {
        this.totalReviews++;
    }

    public void incrementCorrectReviews() {
        this.correctReviews++;
        if (this.totalReviews > 0) {
            this.retentionRate = (float) this.correctReviews / this.totalReviews;
        }
    }

    public void updateAvgReviewDuration(int durationSeconds) {
        if (this.totalReviews == 1) {
            this.avgReviewDuration = durationSeconds;
        } else if (this.totalReviews > 1) {
            this.avgReviewDuration = (this.avgReviewDuration * (this.totalReviews - 1) + durationSeconds)
                    / this.totalReviews;
        }
    }

    public void updateDifficultyScore() {
        float retentionFactor = (1 - this.retentionRate) * 0.5f;
        float hardFactor = this.totalReviews > 0 ? ((float) this.hardCount / this.totalReviews) * 0.3f : 0;
        float durationFactor = Math.min(1.0f, (float) this.avgReviewDuration / 60) * 0.2f;
        this.difficultyScore = retentionFactor + hardFactor + durationFactor;
    }
}
