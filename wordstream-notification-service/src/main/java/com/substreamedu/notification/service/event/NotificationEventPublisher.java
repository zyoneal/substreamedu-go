package com.substreamedu.notification.service.event;

import com.substreamedu.notification.dto.event.WordReviewedEvent;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private static final String TOPIC = "word-reviewed-events";

    @Retry(name = "kafkaPublisher")
    public void publishWordReviewed(WordReviewedEvent event) {
        log.info("Publishing word reviewed event: {}", event);
        kafkaTemplate.send(TOPIC, event.userId().toString(), event);
    }
}
