package com.substreamedu.dictionary.service.impl;

import com.substreamedu.dictionary.service.TranslationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TranslationServiceFactory {
    private final TranslationService translationService;

    public TranslationService getTranslationService(boolean isPremium) {
        return translationService;
    }
}
