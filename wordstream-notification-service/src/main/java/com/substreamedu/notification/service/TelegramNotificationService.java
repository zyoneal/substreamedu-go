package com.substreamedu.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Slf4j
@Service
public class TelegramNotificationService {

    public void sendReviewConfirmation(UUID userId, Long wordId, String rating) {
        log.info("Sending review confirmation for user {} and word {}", userId, wordId);
        // In a real FAANG system, we'd lookup the chatId by userId in a database.
        // For this demo/best-effort, we assume the bot has a way to find the relevant
        // user
        // or we just log that the notification was 'sent'.

        // Example: bot.sendConfirmation(userId, "You just reviewed a word!");
    }
}
