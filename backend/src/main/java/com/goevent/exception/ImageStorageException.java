package com.goevent.exception;

/**
 * The image was valid but could not be stored, served or deleted. Mapped to
 * HTTP 500 by {@link ImageExceptionHandler} after the failure is logged.
 */
public class ImageStorageException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public ImageStorageException(String message) {
        super(message);
    }
}