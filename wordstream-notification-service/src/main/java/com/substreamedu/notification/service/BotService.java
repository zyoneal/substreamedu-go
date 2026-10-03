package com.substreamedu.notification.service;

import com.substreamedu.notification.dto.response.DictionaryItemResponse;
import com.substreamedu.notification.dto.response.UserResponse;

import java.util.List;
import java.util.UUID;

public interface BotService {
    UserResponse authenticate(String token);

    DictionaryItemResponse getRandomWord(UUID userId);

    List<DictionaryItemResponse> getSrsCardsForToday(UUID userId);

    Integer getStreak(UUID userId);

    void recordAnswer(UUID userId, Long wordId, String rating, int durationSeconds);
}
