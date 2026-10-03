package com.substreamedu.dictionary.service.event;

import com.substreamedu.dictionary.dto.event.WordReviewedEvent;
import com.substreamedu.dictionary.service.LearningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class LearningEventListener {

    private final LearningService learningService;

    @KafkaListener(topics = "word-reviewed-events", groupId = "dictionary-group")
    public void handleWordReviewed(WordReviewedEvent event) {
        log.info("Received word reviewed event: {}", event);
        try {
            learningService.reviewCard(event.wordId(), event.rating(), 0);
        } catch (Exception e) {
            log.error("Failed to process word reviewed event", e);
        }
    }
}
