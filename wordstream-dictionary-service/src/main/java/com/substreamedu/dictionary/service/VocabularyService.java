package com.substreamedu.dictionary.service;

import com.substreamedu.dictionary.dto.request.AddWordRequestDto;
import com.substreamedu.dictionary.dto.response.DictionaryGroupDto;
import com.substreamedu.dictionary.dto.response.DictionaryItemDto;

import java.util.List;
import java.util.UUID;

public interface VocabularyService {
    List<DictionaryItemDto> getAllLexemes(UUID userId);

    DictionaryItemDto addToVocabulary(UUID userId, AddWordRequestDto request);

    List<DictionaryItemDto> getLexemesByResource(UUID userId, String resourceName);

    List<DictionaryGroupDto> getVocabularyGroups(UUID userId);

    void deleteItem(Long id);

    void deleteResource(UUID userId, String resourceName);

    DictionaryItemDto getRandomWord(UUID userId);

    int calculateUserStreak(UUID userId);

    byte[] exportDictionaryAsCsv(UUID userId);

    byte[] exportResourceAsCsv(UUID userId, String resourceName);
}
