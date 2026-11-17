package com.goevent.exception;

import org.springframework.http.HttpStatus;

public class ImageException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    private final HttpStatus status;

    public ImageException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }
}