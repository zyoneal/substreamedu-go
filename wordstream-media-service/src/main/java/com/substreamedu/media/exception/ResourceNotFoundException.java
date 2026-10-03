package com.substreamedu.media.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends MediaException {
    public ResourceNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
