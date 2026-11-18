package com.goevent.exception;

import org.springframework.http.HttpStatus;

public class EventException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final HttpStatus status;

    public EventException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }

    public static EventException badRequest(String message) {
        return new EventException(HttpStatus.BAD_REQUEST, message);
    }

    public static EventException unauthorized(String message) {
        return new EventException(HttpStatus.UNAUTHORIZED, message);
    }

    public static EventException forbidden(String message) {
        return new EventException(HttpStatus.FORBIDDEN, message);
    }

    public static EventException notFound(String message) {
        return new EventException(HttpStatus.NOT_FOUND, message);
    }
}
