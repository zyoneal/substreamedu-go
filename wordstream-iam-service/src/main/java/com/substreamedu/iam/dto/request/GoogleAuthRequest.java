package com.substreamedu.iam.dto.request;

import jakarta.validation.constraints.NotBlank;

public record GoogleAuthRequest(
    @NotBlank(message = "Google token is required")
    String token) {
}
