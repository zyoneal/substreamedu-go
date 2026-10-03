package com.substreamedu.media.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class MediaException extends RuntimeException {
    private final HttpStatus status;

    public MediaException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
