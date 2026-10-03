package com.substreamedu.dictionary.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends DictionaryException {
    public ResourceNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
