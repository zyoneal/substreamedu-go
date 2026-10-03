package com.substreamedu.dictionary.service;

import com.substreamedu.dictionary.dto.response.DictionaryItemDto;

import java.util.List;
import java.util.UUID;

public interface LearningService {
    List<DictionaryItemDto> getDailyCards(UUID userId);

    DictionaryItemDto reviewCard(Long cardId, String rating, int responseTimeMs);
}
