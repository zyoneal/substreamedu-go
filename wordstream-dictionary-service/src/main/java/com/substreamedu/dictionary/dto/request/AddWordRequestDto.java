package com.substreamedu.dictionary.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

@Builder
public record AddWordRequestDto(
        @NotBlank(message = "Highlighted text is required") String highlightedText,

        @NotBlank(message = "Resource name is required") String resourceName,

        String context,
        String extendedContext,
        String translation,
        String note,
        String transcription,
        String definition,
        String imageUrl) {
}
