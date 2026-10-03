package com.substreamedu.dictionary.service.impl;

import com.substreamedu.dictionary.dto.request.DeepSeekRequest;
import com.substreamedu.dictionary.dto.response.DeepSeekResponse;
import com.substreamedu.dictionary.exception.TranslationException;
import com.substreamedu.dictionary.service.TranslationService;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import io.netty.channel.ChannelOption;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Enhanced DeepSeek service with Resilience4j patterns for high-load
 * environments.
 */
@Slf4j
@Service
public class DeepSeekTranslationService implements TranslationService {

        private final WebClient webClient;

        @Value("${deepseek.api.key}")
        private String deepSeekApiKey;

        private final ConcurrentMap<String, String> languageCache = new ConcurrentHashMap<>();

        public DeepSeekTranslationService(WebClient.Builder webClientBuilder) {
                this.webClient = webClientBuilder
                                .baseUrl("https://api.deepseek.com")
                                .clientConnector(new ReactorClientHttpConnector(
                                                HttpClient.create()
                                                                .responseTimeout(Duration.ofSeconds(15))
                                                                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)
                                                                .option(ChannelOption.SO_KEEPALIVE, true)
                                                                .option(ChannelOption.TCP_NODELAY, true)))
                                .build();
                initializeLanguageCache();
        }

        private void initializeLanguageCache() {
                languageCache.put("en", "English");
                languageCache.put("ru", "Russian");
                languageCache.put("uk", "Ukrainian");
                languageCache.put("pl", "Polish");
                languageCache.put("es", "Spanish");
                languageCache.put("pt", "Portuguese");
                languageCache.put("tr", "Turkish");
                languageCache.put("id", "Indonesian");
                languageCache.put("ar", "Arabic");
                languageCache.put("vi", "Vietnamese");
        }

        @Override
        @CircuitBreaker(name = "deepseek-api")
        @Bulkhead(name = "deepseek-api")
        @Retry(name = "deepseek-api")
        public String translateTextWithContextFromSubtitles(String userId, String text, String sourceLang,
                        String targetLang, String context, String extendedContext) {

                long startTime = System.currentTimeMillis();
                log.info("⇄ Translation Started | userId={} | text='{}' | sourceLang={} | targetLang={}",
                                userId, (text != null ? text.substring(0, Math.min(text.length(), 30)) : "null"),
                                sourceLang, targetLang);

                try {
                        if (text == null || text.trim().isEmpty()) {
                                return "";
                        }
                        String result = translateAsync(text, sourceLang, targetLang, context, extendedContext).join();
                        long duration = System.currentTimeMillis() - startTime;

                        log.info("✓ Translation Success | userId={} | duration={}ms | resultLength={}",
                                        userId, duration, result.length());

                        if (duration > 5000) {
                                log.warn("⚠ Slow Translation | duration={}ms | threshold=5000ms", duration);
                        }

                        return result;

                } catch (Exception e) {
                        log.error("✗ Translation Failed | userId={} | error={} | message={}",
                                        userId, e.getClass().getSimpleName(), e.getMessage());
                        throw e;
                }
        }

        @Override
        @CircuitBreaker(name = "deepseek-api")
        @Bulkhead(name = "deepseek-api")
        @Retry(name = "deepseek-api")
        public String generateCohesiveText(String userId, List<String> words, String language) {
                long startTime = System.currentTimeMillis();
                log.info("⇄ Cohesive Text Generation Started | userId={} | wordsCount={} | language={}",
                                userId, (words != null ? words.size() : 0), language);

                if (words == null || words.isEmpty()) {
                        return "No words provided for text generation.";
                }

                String resolvedLanguage = languageCache.getOrDefault(language, language);
                String prompt = String.format(
                                "Write a short, coherent paragraph using ALL of these %d words and phrases naturally: %s. "
                                                +
                                                "Make sure the text flows naturally and incorporates every single word/phrase from the list. "
                                                +
                                                "The paragraph should be at least 100-150 words long. " +
                                                "Write in natural %s.",
                                words.size(), String.join(", ", words), resolvedLanguage);

                try {
                        DeepSeekRequest request = DeepSeekRequest.builder()
                                        .model("deepseek-chat")
                                        .messages(List.of(new DeepSeekRequest.Message("user", prompt)))
                                        .maxTokens(1000)
                                        .temperature(1.5)
                                        .build();

                        String result = callDeepSeek(request).join();
                        long duration = System.currentTimeMillis() - startTime;

                        log.info("✓ Cohesive Text Success | userId={} | duration={}ms", userId, duration);
                        return result;
                } catch (Exception e) {
                        log.error("✗ Cohesive Text Failed | userId={} | error={}", userId, e.getMessage());
                        throw e;
                }
        }

        @Override
        @CircuitBreaker(name = "deepseek-api")
        @Bulkhead(name = "deepseek-api")
        @Retry(name = "deepseek-api")
        public String generateTextByLevel(String userId, String cefrLevel, String language, String topic) {
                long startTime = System.currentTimeMillis();
                log.info("⇄ CEFR Text Generation Started | userId={} | level={} | lang={} | topic={}",
                                userId, cefrLevel, language, topic);

                try {
                        String resolvedLanguage = languageCache.getOrDefault(language, language);
                        String prompt = createCEFRLevelPrompt(cefrLevel, resolvedLanguage, topic);

                        DeepSeekRequest request = DeepSeekRequest.builder()
                                        .model("deepseek-chat")
                                        .messages(List.of(new DeepSeekRequest.Message("user", prompt)))
                                        .maxTokens(getMaxTokensForLevel(cefrLevel))
                                        .temperature(1.5)
                                        .topP(0.95)
                                        .build();

                        String result = callDeepSeek(request).join();
                        long duration = System.currentTimeMillis() - startTime;

                        log.info("✓ CEFR Text Success | userId={} | duration={}ms", userId, duration);
                        return result;
                } catch (Exception e) {
                        log.error("✗ CEFR Text Failed | userId={} | level={} | error={}", userId, cefrLevel,
                                        e.getMessage());
                        throw e;
                }
        }

        private CompletableFuture<String> translateAsync(String text, String sourceLang, String targetLang,
                        String context, String extendedContext) {
                String resolvedTarget = languageCache.getOrDefault(targetLang, targetLang);
                boolean isSingleWord = text.trim().split("\\s+").length == 1;

                StringBuilder promptBuilder = new StringBuilder();
                promptBuilder.append("Context: \"").append(context).append("\"\n");
                promptBuilder.append("Translate '").append(text).append("' to ").append(resolvedTarget)
                                .append(". Definition MUST be in English.\n\n");

                if (isSingleWord) {
                        promptBuilder.append(
                                        "Format: {\"definition\":\"clear (in English)\",\"translation\":\"перевод\",\"hint\":\"short\",\"style\":\"neutral\"}\n\n");
                        promptBuilder.append(
                                        "gross → {\"definition\":\"disgusting\",\"translation\":\"отвратительный\",\"hint\":\"get gross\",\"style\":\"informal\"}\n");
                        promptBuilder.append(
                                        "house → {\"definition\":\"building\",\"translation\":\"дом\",\"hint\":null,\"style\":\"neutral\"}\n");
                        promptBuilder.append(
                                        "off → {\"definition\":\"away from\",\"translation\":\"прочь\",\"hint\":\"get off\",\"style\":\"neutral\"}\n");
                } else {
                        promptBuilder.append(
                                        "Format: {\"translation\":\"tr\",\"definition\":\"short def (in English)\"}\n\n");
                        promptBuilder.append(
                                        "put aside → {\"translation\":\"отложить\",\"definition\":\"save later\"}\n");
                        promptBuilder.append(
                                        "piece of cake → {\"translation\":\"проще простого\",\"definition\":\"very easy\"}\n");
                        promptBuilder.append(
                                        "you know → {\"translation\":\"знаешь\",\"definition\":\"filler phrase\"}\n");
                }
                promptBuilder.append(text).append(" → ");

                DeepSeekRequest request = DeepSeekRequest.builder()
                                .model("deepseek-chat")
                                .messages(List.of(new DeepSeekRequest.Message("user", promptBuilder.toString())))
                                .maxTokens(calculateOptimalMaxTokens(text))
                                .temperature(1.3)
                                .build();

                return callDeepSeek(request);
        }

        private CompletableFuture<String> callDeepSeek(DeepSeekRequest request) {
                if (deepSeekApiKey == null || deepSeekApiKey.isEmpty()
                                || deepSeekApiKey.equals("${DEEPSEEK_API_KEY}")) {
                        return CompletableFuture
                                        .failedFuture(new TranslationException("DeepSeek API key is not configured"));
                }

                return webClient.post().uri("/chat/completions")
                                .header("Authorization", "Bearer " + deepSeekApiKey)
                                .body(Mono.just(request), DeepSeekRequest.class)
                                .retrieve()
                                .bodyToMono(DeepSeekResponse.class)
                                .timeout(Duration.ofSeconds(30))
                                .map(response -> {
                                        if (response != null && !response.choices().isEmpty()) {
                                                return response.choices().get(0).message().content();
                                        }
                                        throw new TranslationException(
                                                        "DeepSeek returned an empty or invalid response");
                                })
                                .doOnError(e -> log.error("✗ DeepSeek API Error | error={} | message={}",
                                                e.getClass().getSimpleName(), e.getMessage()))
                                .onErrorResume(e -> Mono.error(
                                                new TranslationException("Failed to call DeepSeek: " + e.getMessage())))
                                .toFuture();
        }

        private String createCEFRLevelPrompt(String cefrLevel, String language, String topic) {
                String level = (cefrLevel != null) ? cefrLevel.toUpperCase() : "B1";
                String topicInstruction = (topic != null && !topic.trim().isEmpty())
                                ? String.format(" about the topic: %s", topic)
                                : "";

                return switch (level) {
                        case "A1" -> String.format(
                                        "Write a unique, original text in %s%s. Use ONLY basic vocabulary. Simple present tense. Short sentences (5-7 words). 120-180 words total.",
                                        language, topicInstruction);
                        case "A2" -> String.format(
                                        "Write an original text in %s%s. Use everyday vocabulary. Simple past, present, future tenses. 120-180 words total.",
                                        language, topicInstruction);
                        case "B1" -> String.format(
                                        "Write a coherent text in %s%s. Use intermediate vocabulary and variety of tenses. 120-180 words total.",
                                        language, topicInstruction);
                        case "B2" -> String.format(
                                        "Write a well-structured text in %s%s. Use advanced vocabulary and complex sentence structures. 120-180 words total.",
                                        language, topicInstruction);
                        case "C1" -> String.format(
                                        "Write an original, sophisticated text in %s%s. Use highly advanced, nuanced vocabulary and idioms. 120-180 words total.",
                                        language, topicInstruction);
                        default -> String.format(
                                        "Write a unique text in %s%s. Write 120-180 words with appropriate complexity.",
                                        language, topicInstruction);
                };
        }

        private int getMaxTokensForLevel(String cefrLevel) {
                String level = (cefrLevel != null) ? cefrLevel.toUpperCase() : "B1";
                return switch (level) {
                        case "A1" -> 350;
                        case "A2" -> 400;
                        case "B1" -> 450;
                        case "B2" -> 500;
                        case "C1" -> 550;
                        default -> 450;
                };
        }

        private int calculateOptimalMaxTokens(String text) {
                if (text == null)
                        return 150;
                int wordCount = text.trim().split("\\s+").length;
                if (wordCount == 1)
                        return 150;
                if (wordCount <= 3)
                        return 180;
                if (wordCount <= 10)
                        return 220;
                if (wordCount <= 20)
                        return 280;
                return 400;
        }
}
