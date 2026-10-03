package com.substreamedu.dictionary.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for CEFR level text generation requests.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GenerateTextRequest {

    @NotBlank(message = "CEFR level is required")
    @Pattern(regexp = "^(A1|A2|B1|B2|C1)$", message = "Invalid CEFR level. Must be one of: A1, A2, B1, B2, C1")
    private String cefrLevel;

    @NotBlank(message = "Language is required")
    private String language;

    private String topic;
}
