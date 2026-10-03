package com.substreamedu.notification.dto.response;

import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        boolean active,
        String telegramToken,
        boolean premium) {
}
