package com.substreamedu.dictionary.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record DeepSeekResponse(
        String id,
        String object,
        Long created,
        String model,
        List<Choice> choices,
        Usage usage) {
    public record Choice(
            Message message,
            Integer index,
            @JsonProperty("finish_reason") String finishReason) {
    }

    public record Message(String role, String content) {
    }

    public record Usage(
            @JsonProperty("prompt_tokens") Integer promptTokens,
            @JsonProperty("completion_tokens") Integer completionTokens,
            @JsonProperty("total_tokens") Integer totalTokens) {
    }
}
