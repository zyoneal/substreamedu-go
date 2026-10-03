package com.substreamedu.media.service.impl;

import com.substreamedu.media.dto.request.GenerateTextRequest;
import com.substreamedu.media.service.AiMediaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiMediaServiceImpl implements AiMediaService {

    private final WebClient.Builder webClientBuilder;

    @Value("${deepseek.api.key}")
    private String deepSeekApiKey;

    @Override
    public String generateEducationalText(GenerateTextRequest request) {
        String prompt = String.format(
                "Generate an educational text for language learning. Level: %s. Language: %s. Topic: %s. " +
                        "The text should be engaging and appropriate for the level.",
                request.cefrLevel(), request.language(),
                request.topic() != null ? request.topic() : "General");

        try {
            WebClient webClient = webClientBuilder.build();
            Map<String, Object> body = Map.of(
                    "model", "deepseek-chat",
                    "messages", List.of(Map.of("role", "user", "content", prompt)));

            Map response = webClient.post()
                    .uri("https://api.deepseek.com/v1/chat/completions")
                    .header("Authorization", "Bearer " + deepSeekApiKey)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            if (response != null && response.containsKey("choices")) {
                List choices = (List) response.get("choices");
                if (!choices.isEmpty()) {
                    Map firstChoice = (Map) choices.get(0);
                    Map message = (Map) firstChoice.get("message");
                    return (String) message.get("content");
                }
            }
            return "Failed to generate text.";
        } catch (Exception e) {
            log.error("DeepSeek text generation failed", e);
            return "Error generating text: " + e.getMessage();
        }
    }
}
