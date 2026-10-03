package com.substreamedu.dictionary.service;

import java.util.List;

public interface TranslationService {
    String translateTextWithContextFromSubtitles(String userId, String text, String sourceLang, String targetLang,
            String context, String extendedContext);

    String generateCohesiveText(String userId, List<String> words, String language);

    String generateTextByLevel(String userId, String cefrLevel, String language, String topic);
}
