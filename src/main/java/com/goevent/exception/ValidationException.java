package com.goevent.exception;

/** Input that does not satisfy a basic rule, such as a blank name or a non-positive quantity. */
public class ValidationException extends GoEventException {

    public ValidationException(String message) {
        super(message);
    }
}
