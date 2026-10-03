package com.substreamedu.dictionary.service.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.substreamedu.dictionary.model.OutboxEvent;
import com.substreamedu.dictionary.repository.OutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class OutboxService {

    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public void saveEvent(String aggregateId, String type, Object payload, String topic) {
        try {
            String jsonPayload = objectMapper.writeValueAsString(payload);
            OutboxEvent event = OutboxEvent.builder()
                    .aggregateId(aggregateId)
                    .type(type)
                    .payload(jsonPayload)
                    .topic(topic)
                    .createdAt(LocalDateTime.now())
                    .status(OutboxEvent.OutboxStatus.PENDING)
                    .build();

            outboxRepository.save(event);
            log.debug("Saved event to outbox: {} of type {}", aggregateId, type);
        } catch (Exception e) {
            log.error("Failed to save event to outbox", e);
            throw new RuntimeException("Event persistence failed", e);
        }
    }
}
