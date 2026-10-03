package com.substreamedu.dictionary.exception;

import org.springframework.http.HttpStatus;

public class TranslationBusyException extends DictionaryException {
    public TranslationBusyException(String message) {
        super(message, HttpStatus.TOO_MANY_REQUESTS);
    }
}
