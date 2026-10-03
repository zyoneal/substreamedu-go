package com.substreamedu.dictionary.service.event;

import com.substreamedu.dictionary.model.OutboxEvent;
import com.substreamedu.dictionary.repository.OutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class OutboxProcessor {

    private final OutboxRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void processOutbox() {
        List<OutboxEvent> pendingEvents = outboxRepository
                .findByStatusOrderByCreatedAtAsc(OutboxEvent.OutboxStatus.PENDING);

        for (OutboxEvent event : pendingEvents) {
            try {
                log.info("Processing outbox event: {} of type {}", event.getId(), event.getType());
                kafkaTemplate.send(event.getTopic(), event.getAggregateId(), event.getPayload());

                event.setStatus(OutboxEvent.OutboxStatus.PROCESSED);
                event.setProcessedAt(LocalDateTime.now());
                outboxRepository.save(event);
            } catch (Exception e) {
                log.error("Failed to process outbox event: {}", event.getId(), e);
                // In a production FAANG-level system, you'd implement a retry count or
                // dead-letter outbox
            }
        }
    }
}
