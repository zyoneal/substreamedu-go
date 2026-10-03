package com.substreamedu.dictionary.dto.request;

public record DictionaryRequest(
        String highlightedText,
        String context,
        String extendedContext,
        String learningLanguage,
        String fluentLanguage) {
}
