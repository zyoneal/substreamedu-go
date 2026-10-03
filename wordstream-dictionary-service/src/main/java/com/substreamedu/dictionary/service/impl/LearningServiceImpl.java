package com.substreamedu.dictionary.service.impl;

import com.substreamedu.dictionary.dto.response.DictionaryItemDto;
import com.substreamedu.dictionary.exception.ResourceNotFoundException;
import com.substreamedu.dictionary.mapper.DictionaryMapper;
import com.substreamedu.dictionary.model.Dictionary;
import com.substreamedu.dictionary.repository.DictionaryRepository;
import com.substreamedu.dictionary.service.FSRSEngine;
import com.substreamedu.dictionary.service.FSRSOptimizer;
import com.substreamedu.dictionary.service.LearningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class LearningServiceImpl implements LearningService {

    private final DictionaryRepository dictionaryRepository;
    private final DictionaryMapper dictionaryMapper;
    private final FSRSEngine fsrsEngine;
    private final FSRSOptimizer fsrsOptimizer;
    private final com.substreamedu.dictionary.service.event.OutboxService outboxService;

    private static final int DAILY_CARDS_LIMIT = 20;

    @Override
    @Transactional
    public List<DictionaryItemDto> getDailyCards(UUID userId) {
        LocalDate today = LocalDate.now();
        Pageable pageable = PageRequest.of(0, DAILY_CARDS_LIMIT);
        List<Dictionary> dueWords = dictionaryRepository.findDueWordsSorted(userId, today, pageable);

        if (dueWords.size() < DAILY_CARDS_LIMIT) {
            int needed = DAILY_CARDS_LIMIT - dueWords.size();
            List<Dictionary> newWords = dictionaryRepository.findRandomNewWords(userId, PageRequest.of(0, needed));
            dueWords.addAll(newWords);
        }

        log.debug("Fetched {} cards for daily review for user {}", dueWords.size(), userId);
        return dueWords.stream().map(dictionaryMapper::toDictionaryItemDto).toList();
    }

    @Override
    @Transactional
    public DictionaryItemDto reviewCard(Long cardId, String rating, int responseTimeMs) {
        Dictionary card = dictionaryRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card not found with id: " + cardId));

        var userParams = fsrsOptimizer.getOrCreateParams(card.getUserId());
        fsrsEngine.setPersonalizedParams(userParams);

        try {
            FSRSEngine.UserRating userRating = "forgot".equalsIgnoreCase(rating) ? FSRSEngine.UserRating.FORGOT
                    : FSRSEngine.UserRating.REMEMBER;

            if (fsrsEngine.isLearningCard(card)) {
                fsrsEngine.reviewLearningCard(card, userRating, responseTimeMs);
            } else {
                fsrsEngine.review(card, userRating, responseTimeMs);
            }

            dictionaryRepository.save(card);

            // Publish event to Outbox for reliable delivery
            outboxService.saveEvent(
                    card.getUserId().toString(),
                    "WORD_REVIEWED",
                    new com.substreamedu.dictionary.dto.event.WordReviewedEvent(
                            card.getUserId(),
                            cardId,
                            rating,
                            java.time.LocalDateTime.now()),
                    "word-reviewed-events");

            // Log for future optimization
            fsrsOptimizer.logReview(card.getUserId(), cardId,
                    userRating == FSRSEngine.UserRating.FORGOT ? 1 : (responseTimeMs < 3000 ? 4 : 3),
                    responseTimeMs, card.getInterval(), card.getEaseFactor(), 0, 0, card.getStatus());

            log.info("Card {} reviewed with rating {} by user {}", cardId, rating, card.getUserId());
            return dictionaryMapper.toDictionaryItemDto(card);
        } finally {
            fsrsEngine.clearPersonalizedParams();
        }
    }
}
