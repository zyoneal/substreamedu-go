package com.substreamedu.dictionary.service.impl;

import com.substreamedu.dictionary.dto.request.AddWordRequestDto;
import com.substreamedu.dictionary.dto.response.DictionaryGroupDto;
import com.substreamedu.dictionary.dto.response.DictionaryItemDto;
import com.substreamedu.dictionary.exception.ResourceNotFoundException;
import com.substreamedu.dictionary.mapper.DictionaryMapper;
import com.substreamedu.dictionary.model.Dictionary;
import com.substreamedu.dictionary.repository.DictionaryRepository;
import com.substreamedu.dictionary.service.VocabularyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class VocabularyServiceImpl implements VocabularyService {

    private final DictionaryRepository dictionaryRepository;
    private final DictionaryMapper dictionaryMapper;

    @Override
    @Transactional(readOnly = true)
    public List<DictionaryItemDto> getAllLexemes(UUID userId) {
        return dictionaryRepository.findAll(userId).stream()
                .map(dictionaryMapper::toDictionaryItemDto)
                .toList();
    }

    @Override
    @Transactional
    public DictionaryItemDto addToVocabulary(UUID userId, AddWordRequestDto request) {
        Dictionary dictionary = Dictionary.builder()
                .userId(userId)
                .resourceName(request.resourceName())
                .highlightedText(request.highlightedText().trim())
                .context(request.context())
                .extendedContext(request.extendedContext())
                .translatedText(request.translation())
                .note(request.note())
                .transcription(request.transcription())
                .definition(request.definition())
                .imageUrl(request.imageUrl())
                .status("new")
                .build();

        Dictionary saved = dictionaryRepository.save(dictionary);

        // Business event logging
        log.info("📝 Word Added | userId={} | word='{}' | resource='{}' | hasTranslation={} | hasImage={}",
                userId, request.highlightedText(), request.resourceName(),
                request.translation() != null, request.imageUrl() != null);

        return dictionaryMapper.toDictionaryItemDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DictionaryItemDto> getLexemesByResource(UUID userId, String resourceName) {
        return dictionaryRepository.findAllByUserIdAndResourceNameIgnoreCase(userId, resourceName).stream()
                .map(dictionaryMapper::toDictionaryItemDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DictionaryGroupDto> getVocabularyGroups(UUID userId) {
        return dictionaryRepository.findAllDictionaryGroups(userId);
    }

    @Override
    @Transactional
    public void deleteItem(Long id) {
        if (!dictionaryRepository.existsById(id)) {
            log.warn("❌ Delete Failed | itemId={} | reason=NOT_FOUND", id);
            throw new ResourceNotFoundException("Vocabulary item not found with id: " + id);
        }

        dictionaryRepository.deleteById(id);
        log.info("🗑 Item Deleted | itemId={}", id);
    }

    @Override
    @Transactional
    public void deleteResource(UUID userId, String resourceName) {
        long startTime = System.currentTimeMillis();
        dictionaryRepository.deleteByUserIdAndResourceName(userId, resourceName);
        long duration = System.currentTimeMillis() - startTime;

        log.info("🗑 Resource Deleted | userId={} | resource='{}' | duration={}ms",
                userId, resourceName, duration);
    }

    @Override
    @Transactional(readOnly = true)
    public DictionaryItemDto getRandomWord(UUID userId) {
        List<Dictionary> words = dictionaryRepository.findRandomWordsByUserId(userId, 1);
        if (words.isEmpty()) {
            throw new ResourceNotFoundException("No words found in your vocabulary");
        }
        return dictionaryMapper.toDictionaryItemDto(words.get(0));
    }

    @Override
    @Transactional(readOnly = true)
    public int calculateUserStreak(UUID userId) {
        List<LocalDate> reviewDates = dictionaryRepository.findDistinctReviewDates(userId);
        if (reviewDates.isEmpty())
            return 0;

        int streak = 0;
        LocalDate current = LocalDate.now();

        // Check if reviewed today or yesterday to continue streak
        if (!reviewDates.get(0).equals(current) && !reviewDates.get(0).equals(current.minusDays(1))) {
            return 0;
        }

        for (LocalDate date : reviewDates) {
            if (date.equals(current)) {
                streak++;
                current = current.minusDays(1);
            } else if (date.isBefore(current)) {
                break; // Gap in streak
            }
        }
        return streak;
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportDictionaryAsCsv(UUID userId) {
        List<Dictionary> items = dictionaryRepository.findAll(userId);
        return generateCsv(items);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportResourceAsCsv(UUID userId, String resourceName) {
        List<Dictionary> items = dictionaryRepository.findAllByUserIdAndResourceNameIgnoreCase(userId, resourceName);
        return generateCsv(items);
    }

    private byte[] generateCsv(List<Dictionary> items) {
        StringBuilder csv = new StringBuilder();
        csv.append("Word,Translation,Context,Note,Resource,Level,Status\n");
        for (Dictionary item : items) {
            csv.append(escapeCsv(item.getHighlightedText())).append(",");
            csv.append(escapeCsv(item.getTranslatedText())).append(",");
            csv.append(escapeCsv(item.getContext())).append(",");
            csv.append(escapeCsv(item.getNote())).append(",");
            csv.append(escapeCsv(item.getResourceName())).append(",");
            csv.append(item.getRepetitionLevel()).append(",");
            csv.append(escapeCsv(item.getStatus())).append("\n");
        }
        return csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private String escapeCsv(String value) {
        if (value == null)
            return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
