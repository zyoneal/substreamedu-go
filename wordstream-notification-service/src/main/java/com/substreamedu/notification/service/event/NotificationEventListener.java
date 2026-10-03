package com.substreamedu.notification.service.event;

import com.substreamedu.notification.dto.event.WordReviewedEvent;
import com.substreamedu.notification.service.TelegramNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.retrytopic.TopicSuffixingStrategy;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationEventListener {

    private final TelegramNotificationService notificationService;

    @RetryableTopic(attempts = "4", backoff = @Backoff(delay = 1000, multiplier = 2, maxDelay = 10000), topicSuffixingStrategy = TopicSuffixingStrategy.SUFFIX_WITH_INDEX_VALUE, dltTopicSuffix = "-dlt", include = {
            Exception.class })
    @KafkaListener(topics = "word-reviewed-events", groupId = "notification-group")
    public void handleWordReviewed(WordReviewedEvent event) {
        log.info("Processing WordReviewedEvent: userId={}, wordId={}, rating={}",
                event.userId(), event.wordId(), event.rating());

        notificationService.sendReviewConfirmation(event.userId(), event.wordId(), event.rating());

        log.info("Successfully processed WordReviewedEvent for userId={}", event.userId());
    }

    @DltHandler
    public void handleDlt(WordReviewedEvent event, Exception exception) {
        log.error("Message sent to DLT after all retries failed | userId={} | wordId={} | error={}",
                event.userId(), event.wordId(), exception.getMessage());
        // TODO: Add alerting/monitoring for DLT messages
    }
}
