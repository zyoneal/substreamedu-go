package com.substreamedu.media.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record GenerateTextRequest(
        @NotBlank(message = "CEFR level is required") @Pattern(regexp = "^(A1|A2|B1|B2|C1)$", message = "Invalid CEFR level. Must be one of: A1, A2, B1, B2, C1") String cefrLevel,

        @NotBlank(message = "Language is required") String language,

        String topic) {
}
