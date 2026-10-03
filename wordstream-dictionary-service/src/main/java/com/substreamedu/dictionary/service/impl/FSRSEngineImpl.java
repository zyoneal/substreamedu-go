package com.substreamedu.dictionary.service.impl;

import com.substreamedu.dictionary.model.Dictionary;
import com.substreamedu.dictionary.model.UserSRSParameters;
import com.substreamedu.dictionary.service.FSRSEngine;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Slf4j
@Service
public class FSRSEngineImpl implements FSRSEngine {

    private static final double W0 = 0.40255;
    private static final double W1 = 1.18385;
    private static final double W2 = 3.173;
    private static final double W3 = 15.69105;
    private static final double W4 = 7.1949;
    private static final double W5 = 0.5345;
    private static final double W6 = 1.4604;
    private static final double W7 = 0.0046;
    private static final double W8 = 1.54575;
    private static final double W9 = 0.1192;
    private static final double W10 = 1.01925;
    private static final double W11 = 1.9395;
    private static final double W12 = 0.11;

    private static final double DECAY = -0.5;
    private static final double FACTOR = 19.0 / 81.0;

    private static final int FAST_THRESHOLD_MS = 3000;
    private static final int SLOW_THRESHOLD_MS = 8000;

    private static final double TARGET_RETENTION = 0.90;
    private static final int MAX_INTERVAL_DAYS = 365;
    private static final int[] LEARNING_STEPS_MINUTES = { 1, 10, 1440 };

    private static final ThreadLocal<float[]> personalizedParams = new ThreadLocal<>();

    @Override
    public void setPersonalizedParams(UserSRSParameters params) {
        if (params != null) {
            personalizedParams.set(params.toArray());
        }
    }

    @Override
    public void clearPersonalizedParams() {
        personalizedParams.remove();
    }

    private double getParam(int index, double defaultValue) {
        float[] params = personalizedParams.get();
        if (params != null && index < params.length) {
            return params[index];
        }
        return defaultValue;
    }

    private double w0() {
        return getParam(0, W0);
    }

    private double w1() {
        return getParam(1, W1);
    }

    private double w2() {
        return getParam(2, W2);
    }

    private double w3() {
        return getParam(3, W3);
    }

    private double w8() {
        return getParam(8, W8);
    }

    private double w9() {
        return getParam(9, W9);
    }

    private double w10() {
        return getParam(10, W10);
    }

    private double w11() {
        return getParam(11, W11);
    }

    private double w12() {
        return getParam(12, W12);
    }

    private enum InternalGrade {
        AGAIN(1), HARD(2), GOOD(3), EASY(4);

        final int value;

        InternalGrade(int value) {
            this.value = value;
        }
    }

    @Override
    public ReviewResult review(Dictionary card, UserRating rating, int responseTimeMs) {
        if (rating == UserRating.FORGOT) {
            return handleForgot(card);
        }
        InternalGrade grade = inferGrade(responseTimeMs);
        return handleRemember(card, grade);
    }

    private ReviewResult handleForgot(Dictionary card) {
        LocalDate today = LocalDate.now();
        card.incrementLapses();
        card.incrementHardCount();
        card.resetConsecutiveSuccess();

        card.setStatus("learning");
        card.setLearningStep(0);
        card.setLearningDue(null);

        float currentStability = Math.max(card.getInterval(), 1);
        float newStability = Math.max(1, currentStability * 0.2f);

        card.setInterval(newStability);
        card.setNextRepetitionDate(today);
        card.setLastReviewed(today);
        card.updateDifficultyScore();

        return new ReviewResult(0, true, newStability);
    }

    private ReviewResult handleRemember(Dictionary card, InternalGrade grade) {
        LocalDate today = LocalDate.now();
        float stability = Math.max(card.getInterval(), 0.5f);
        float difficulty = card.getEaseFactor();
        float d = Math.max(1, Math.min(10, 11 - difficulty * 4));

        double r = calculateRetrievability(card, today);
        double newStability = calculateNewStability(stability, d, r, grade);
        float newDifficulty = updateDifficulty(d, grade);
        float newEaseFactor = Math.max(1.3f, Math.min(2.5f, (11 - newDifficulty) / 4));

        int interval = stabilityToInterval(newStability);
        interval = Math.max(1, Math.min(interval, MAX_INTERVAL_DAYS));

        card.setInterval((float) newStability);
        card.setEaseFactor(newEaseFactor);
        card.setNextRepetitionDate(today.plusDays(interval));
        card.setLastReviewed(today);
        card.setRepetitionLevel(card.getRepetitionLevel() + 1);
        card.incrementConsecutiveSuccess();
        card.incrementCorrectReviews();
        card.incrementTotalReviews();
        card.resetHardCount();

        if ("learning".equals(card.getStatus()) || "new".equals(card.getStatus())) {
            card.setStatus("review");
        }
        card.updateDifficultyScore();

        return new ReviewResult(interval, false, (float) newStability);
    }

    private InternalGrade inferGrade(int responseTimeMs) {
        if (responseTimeMs < FAST_THRESHOLD_MS)
            return InternalGrade.EASY;
        if (responseTimeMs > SLOW_THRESHOLD_MS)
            return InternalGrade.HARD;
        return InternalGrade.GOOD;
    }

    @Override
    public double calculateRetrievability(Dictionary card, LocalDate today) {
        if (card.getLastReviewed() == null)
            return 0.9;
        long daysSinceReview = ChronoUnit.DAYS.between(card.getLastReviewed(), today);
        if (daysSinceReview <= 0)
            return 0.99;

        float stability = Math.max(card.getInterval(), 1);
        double r = Math.pow(1 + FACTOR * (double) daysSinceReview / stability, DECAY);
        return Math.max(0.01, Math.min(0.99, r));
    }

    private double calculateNewStability(float s, float d, double r, InternalGrade grade) {
        double hardPenalty = grade == InternalGrade.HARD ? W11 : 1.0;
        double easyBonus = grade == InternalGrade.EASY ? (1 + W12) : 1.0;
        if (grade == InternalGrade.HARD)
            easyBonus = 1.0 / hardPenalty;

        double stabilityIncrease = Math.exp(W8) * (11 - d) * Math.pow(s, -W9) * (Math.exp(W10 * (1 - r)) - 1)
                * easyBonus;
        return Math.max(1, Math.min(s * (stabilityIncrease + 1), MAX_INTERVAL_DAYS * 2));
    }

    private float updateDifficulty(float d, InternalGrade grade) {
        double delta = -W6 * (grade.value - 3);
        double dPrime = d + delta * (10 - d) / 9;
        double meanD = W4 - Math.exp(W5 * (4 - 1)) + 1;
        double dFinal = W7 * meanD + (1 - W7) * dPrime;
        return (float) Math.max(1, Math.min(10, dFinal));
    }

    private int stabilityToInterval(double stability) {
        double interval = (stability / FACTOR) * (Math.pow(TARGET_RETENTION, 1.0 / DECAY) - 1);
        return (int) Math.round(interval);
    }

    @Override
    public ReviewResult reviewLearningCard(Dictionary card, UserRating rating, int responseTimeMs) {
        Instant now = Instant.now();
        if (rating == UserRating.FORGOT) {
            card.setLearningStep(0);
            card.setLearningDue(null);
            card.incrementLapses();
            card.incrementHardCount();
            card.resetConsecutiveSuccess();
            return new ReviewResult(0, true, card.getInterval(), null, card.getLearningStep());
        }
        int nextStep = card.getLearningStep() + 1;
        if (nextStep >= LEARNING_STEPS_MINUTES.length) {
            return graduateToReview(card, responseTimeMs);
        }
        card.setLearningStep(nextStep);
        card.setLearningDue(now.plusSeconds(LEARNING_STEPS_MINUTES[nextStep] * 60L));
        card.incrementConsecutiveSuccess();
        return new ReviewResult(0, true, card.getInterval(), card.getLearningDue(), card.getLearningStep());
    }

    private ReviewResult graduateToReview(Dictionary card, int responseTimeMs) {
        LocalDate today = LocalDate.now();
        card.setLearningStep(0);
        card.setLearningDue(null);
        card.setStatus("review");
        InternalGrade grade = inferGrade(responseTimeMs);
        float initialStability = switch (grade) {
            case AGAIN -> (float) w0();
            case HARD -> (float) w1();
            case GOOD -> (float) w2();
            case EASY -> (float) w3();
        };
        int interval = stabilityToInterval(initialStability);
        interval = Math.max(1, Math.min(interval, MAX_INTERVAL_DAYS));
        card.setInterval(initialStability);
        card.setNextRepetitionDate(today.plusDays(interval));
        card.setLastReviewed(today);
        card.incrementConsecutiveSuccess();
        card.incrementCorrectReviews();
        card.incrementTotalReviews();
        return new ReviewResult(interval, false, initialStability, null, -1);
    }

    @Override
    public boolean isLearningCard(Dictionary card) {
        return "new".equals(card.getStatus()) || "learning".equals(card.getStatus()) || card.getLearningDue() != null;
    }
}
