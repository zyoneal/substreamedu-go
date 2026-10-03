package com.substreamedu.dictionary.controller;

import com.substreamedu.dictionary.dto.request.AddWordRequestDto;
import com.substreamedu.dictionary.dto.request.DictionaryRequest;
import com.substreamedu.dictionary.dto.request.GenerateCohesiveTextRequest;
import com.substreamedu.dictionary.dto.request.GenerateTextRequest;
import com.substreamedu.dictionary.dto.request.Review2ButtonRequest;
import com.substreamedu.dictionary.dto.response.ApiResponse;
import com.substreamedu.dictionary.dto.response.DictionaryGroupDto;
import com.substreamedu.dictionary.dto.response.DictionaryItemDto;
import com.substreamedu.dictionary.dto.response.TranslationProdResponse;
import com.substreamedu.dictionary.exception.DictionaryException;
import com.substreamedu.dictionary.service.LearningService;
import com.substreamedu.dictionary.service.TranslationService;
import com.substreamedu.dictionary.service.VocabularyService;
import com.substreamedu.dictionary.service.impl.TranslationServiceFactory;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/dictionary")
public class DictionaryController {

    private final VocabularyService vocabularyService;
    private final LearningService learningService;
    private final TranslationServiceFactory translationServiceFactory;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    private UUID getUserId(String userIdHeader) {
        if (userIdHeader == null || "undefined".equals(userIdHeader) || "null".equals(userIdHeader)
                || userIdHeader.isEmpty()) {
            log.warn("User context missing in request header");
            return null;
        }
        try {
            return UUID.fromString(userIdHeader);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid user context format: {}", userIdHeader);
            return null;
        }
    }

    @PostMapping("/translated")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<DictionaryItemDto> addToDictionary(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Valid @RequestBody AddWordRequestDto request) {
        UUID uid = getUserId(userId);
        if (uid == null)
            throw new DictionaryException("Unauthorized", HttpStatus.UNAUTHORIZED);
        return ApiResponse.success(vocabularyService.addToVocabulary(uid, request));
    }

    @PostMapping("/translation/prod")
    public ApiResponse<TranslationProdResponse> getTranslationProd(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody DictionaryRequest request) {

        TranslationService translationService = translationServiceFactory.getTranslationService(true);
        String result = translationService.translateTextWithContextFromSubtitles(
                userId, request.highlightedText(), request.learningLanguage(),
                request.fluentLanguage(), request.context(), request.extendedContext());

        try {
            String jsonToParse = result.trim();
            if (jsonToParse.startsWith("```json"))
                jsonToParse = jsonToParse.substring(7);
            if (jsonToParse.endsWith("```"))
                jsonToParse = jsonToParse.substring(0, jsonToParse.length() - 3);
            jsonToParse = jsonToParse.trim();

            TranslationProdResponse response = objectMapper.readValue(jsonToParse, TranslationProdResponse.class);
            return ApiResponse.success(response);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            log.error("Failed to parse translation response: {}", result, e);
            return ApiResponse.success(TranslationProdResponse.builder().translation(result).build());
        }
    }

    @GetMapping("/resources/items")
    public ApiResponse<List<DictionaryItemDto>> getAll(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        UUID uid = getUserId(userId);
        if (uid == null)
            throw new DictionaryException("Unauthorized", HttpStatus.UNAUTHORIZED);
        return ApiResponse.success(vocabularyService.getAllLexemes(uid));
    }

    @GetMapping("/resources/{name}/items")
    public ApiResponse<List<DictionaryItemDto>> getByResource(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @PathVariable("name") String name) {
        UUID uid = getUserId(userId);
        if (uid == null)
            throw new DictionaryException("Unauthorized", HttpStatus.UNAUTHORIZED);
        return ApiResponse.success(vocabularyService.getLexemesByResource(uid, name));
    }

    @GetMapping("/resources")
    public ApiResponse<List<DictionaryGroupDto>> getAllGroups(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        UUID uid = getUserId(userId);
        if (uid == null)
            throw new DictionaryException("Unauthorized", HttpStatus.UNAUTHORIZED);
        return ApiResponse.success(vocabularyService.getVocabularyGroups(uid));
    }

    @DeleteMapping("/resources/{name}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteResource(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @PathVariable("name") String name) {
        UUID uid = getUserId(userId);
        if (uid == null)
            throw new DictionaryException("Unauthorized", HttpStatus.UNAUTHORIZED);
        vocabularyService.deleteResource(uid, name);
    }

    @GetMapping("/srs/today")
    public ApiResponse<List<DictionaryItemDto>> getSrsCardsForToday(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        UUID uid = getUserId(userId);
        if (uid == null)
            throw new DictionaryException("Unauthorized", HttpStatus.UNAUTHORIZED);
        return ApiResponse.success(learningService.getDailyCards(uid));
    }

    @GetMapping("/random")
    public ApiResponse<DictionaryItemDto> getRandomWord(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        UUID uid = getUserId(userId);
        if (uid == null)
            throw new DictionaryException("Unauthorized", HttpStatus.UNAUTHORIZED);
        return ApiResponse.success(vocabularyService.getRandomWord(uid));
    }

    @GetMapping("/streak")
    public ApiResponse<Integer> calculateUserStreak(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        UUID uid = getUserId(userId);
        if (uid == null)
            throw new DictionaryException("Unauthorized", HttpStatus.UNAUTHORIZED);
        return ApiResponse.success(vocabularyService.calculateUserStreak(uid));
    }

    @PostMapping("/item/{id}/review2")
    public ApiResponse<DictionaryItemDto> reviewCard2Button(
            @PathVariable Long id,
            @RequestBody Review2ButtonRequest request) {
        return ApiResponse.success(learningService.reviewCard(id, request.rating(), request.responseTimeMs()));
    }

    @GetMapping("/export/csv")
    public org.springframework.http.ResponseEntity<byte[]> exportFullDictionary(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        UUID uid = getUserId(userId);
        if (uid == null)
            return org.springframework.http.ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        byte[] csvData = vocabularyService.exportDictionaryAsCsv(uid);
        return org.springframework.http.ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=dictionary.csv")
                .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                .body(csvData);
    }

    @GetMapping("/resources/{name}/export/csv")
    public org.springframework.http.ResponseEntity<byte[]> exportResourceWords(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @PathVariable("name") String name) {
        UUID uid = getUserId(userId);
        if (uid == null)
            return org.springframework.http.ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        byte[] csvData = vocabularyService.exportResourceAsCsv(uid, name);
        return org.springframework.http.ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=dictionary_" + name + ".csv")
                .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                .body(csvData);
    }

    @DeleteMapping("/resources/{name}/items/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDictionaryItem(@PathVariable Long id) {
        vocabularyService.deleteItem(id);
    }

    @PostMapping("/generate-text")
    public ApiResponse<String> generateTextByLevel(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Valid @RequestBody GenerateTextRequest request) {
        log.info("Request to /generate-text: {}", request);
        TranslationService translationService = translationServiceFactory.getTranslationService(false);
        String result = translationService.generateTextByLevel(
                userId, request.getCefrLevel(), request.getLanguage(), request.getTopic());
        return ApiResponse.success(result);
    }

    @PostMapping("/generate-cohesive")
    public ApiResponse<String> generateCohesiveText(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Valid @RequestBody GenerateCohesiveTextRequest request) {
        TranslationService translationService = translationServiceFactory.getTranslationService(false);
        return ApiResponse.success(translationService.generateCohesiveText(
                userId, request.getWords(), request.getLanguage()));
    }
}
