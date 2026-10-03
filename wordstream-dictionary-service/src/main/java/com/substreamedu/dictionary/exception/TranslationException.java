package com.substreamedu.dictionary.exception;

import org.springframework.http.HttpStatus;

public class TranslationException extends DictionaryException {
    public TranslationException(String message) {
        super(message, HttpStatus.SERVICE_UNAVAILABLE);
    }
}
