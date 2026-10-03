package com.substreamedu.dictionary.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for word-based cohesive text generation requests.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GenerateCohesiveTextRequest {

    @NotEmpty(message = "Words list cannot be empty")
    private List<String> words;

    @NotBlank(message = "Language is required")
    private String language;
}
