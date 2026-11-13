package com.goevent.exception;

/**
 * A rejected upload: empty file, unsupported/corrupt format or too large for
 * the configured image policy. Mapped to HTTP 400 by
 * {@link ImageExceptionHandler}.
 */
public class InvalidImageException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public InvalidImageException(String message) {
        super(message);
    }
}