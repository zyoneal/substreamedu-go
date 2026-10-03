package com.substreamedu.dictionary.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record DeepSeekRequest(
        String model,
        List<Message> messages,
        @JsonProperty("max_tokens") Integer maxTokens,
        Double temperature,
        Boolean stream,
        @JsonProperty("top_p") Double topP,
        List<String> stop,
        @JsonProperty("presence_penalty") Double presencePenalty,
        @JsonProperty("frequency_penalty") Double frequencyPenalty) {
    public record Message(String role, String content) {
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String model;
        private List<Message> messages;
        private Integer maxTokens;
        private Double temperature;
        private Boolean stream;
        private Double topP;
        private List<String> stop;
        private Double presencePenalty;
        private Double frequencyPenalty;

        public Builder model(String model) {
            this.model = model;
            return this;
        }

        public Builder messages(List<Message> messages) {
            this.messages = messages;
            return this;
        }

        public Builder maxTokens(Integer maxTokens) {
            this.maxTokens = maxTokens;
            return this;
        }

        public Builder temperature(Double temperature) {
            this.temperature = temperature;
            return this;
        }

        public Builder stream(Boolean stream) {
            this.stream = stream;
            return this;
        }

        public Builder topP(Double topP) {
            this.topP = topP;
            return this;
        }

        public Builder stop(List<String> stop) {
            this.stop = stop;
            return this;
        }

        public Builder presencePenalty(Double presencePenalty) {
            this.presencePenalty = presencePenalty;
            return this;
        }

        public Builder frequencyPenalty(Double frequencyPenalty) {
            this.frequencyPenalty = frequencyPenalty;
            return this;
        }

        public DeepSeekRequest build() {
            return new DeepSeekRequest(model, messages, maxTokens, temperature, stream, topP, stop, presencePenalty,
                    frequencyPenalty);
        }
    }
}
