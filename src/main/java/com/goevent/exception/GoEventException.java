package com.goevent.exception;

/** Base type for every error the GoEvent application reports to the user. */
public class GoEventException extends RuntimeException {

    public GoEventException(String message) {
        super(message);
    }

    public GoEventException(String message, Throwable cause) {
        super(message, cause);
    }
}
