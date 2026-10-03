package com.substreamedu.dictionary.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class DictionaryException extends RuntimeException {
    private final HttpStatus status;

    public DictionaryException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
