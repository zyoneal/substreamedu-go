package com.substreamedu.notification.bot;

import java.util.UUID;

public record UserState(
        String state,
        UUID userId) {
    public static UserState empty(UUID userId) {
        return new UserState("", userId);
    }

    public static UserState awaitingToken() {
        return new UserState("AWAITING_TOKEN", null);
    }
}
