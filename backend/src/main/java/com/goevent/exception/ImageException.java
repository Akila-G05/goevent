package com.goevent.exception;

import org.springframework.http.HttpStatus;

/**
 * An image rejection (400/413) or storage failure (500). The attached status
 * is used by {@link ImageExceptionHandler} so a single exception type covers
 * every case without leaking storage details to the client.
 */
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