package com.goevent.exception;

/** Login failed or the caller is not allowed to perform the action. */
public class UnauthorizedException extends GoEventException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
