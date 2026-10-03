package com.substreamedu.notification.service.impl;

import com.substreamedu.notification.client.DictionaryClient;
import com.substreamedu.notification.client.IamClient;
import com.substreamedu.notification.dto.event.WordReviewedEvent;
import com.substreamedu.notification.dto.response.ApiResponse;
import com.substreamedu.notification.dto.response.DictionaryItemResponse;
import com.substreamedu.notification.dto.response.UserResponse;
import com.substreamedu.notification.service.BotService;
import com.substreamedu.notification.service.event.NotificationEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BotServiceImpl implements BotService {

    private final IamClient iamClient;
    private final DictionaryClient dictionaryClient;
    private final NotificationEventPublisher eventPublisher;

    @Override
    public UserResponse authenticate(String token) {
        ApiResponse<UserResponse> response = iamClient.getUserByTelegramToken(token);
        if (response != null && response.isSuccess()) {
            return response.getData();
        }
        return null;
    }

    @Override
    public DictionaryItemResponse getRandomWord(UUID userId) {
        ApiResponse<DictionaryItemResponse> response = dictionaryClient.getRandomWord(userId.toString());
        if (response != null && response.isSuccess()) {
            return response.getData();
        }
        return null;
    }

    @Override
    public List<DictionaryItemResponse> getSrsCardsForToday(UUID userId) {
        ApiResponse<List<DictionaryItemResponse>> response = dictionaryClient.getSrsCardsForToday(userId.toString());
        if (response != null && response.isSuccess()) {
            return response.getData();
        }
        return List.of();
    }

    @Override
    public Integer getStreak(UUID userId) {
        ApiResponse<Integer> response = dictionaryClient.calculateUserStreak(userId.toString());
        if (response != null && response.isSuccess()) {
            return response.getData();
        }
        return 0;
    }

    @Override
    public void recordAnswer(UUID userId, Long wordId, String rating, int durationSeconds) {
        log.info("Recording answer for user {} and word {}: {}", userId, wordId, rating);

        WordReviewedEvent event = new WordReviewedEvent(
                userId,
                wordId,
                rating,
                LocalDateTime.now());

        eventPublisher.publishWordReviewed(event);
    }
}
