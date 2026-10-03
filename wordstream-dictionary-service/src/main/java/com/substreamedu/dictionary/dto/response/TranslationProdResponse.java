package com.substreamedu.dictionary.dto.response;

import lombok.Builder;
import java.util.List;

@Builder
public record TranslationProdResponse(
        String translation,
        String definition,
        String context,
        String transcription,
        String imageUrl,
        String hint,
        List<String> examples,
        List<String> synonyms,
        String style,
        String partOfSpeech) {
}
