package com.goevent.exception;

/** A booking breaks a business rule, such as booking an event that has already started. */
public class BookingException extends GoEventException {

    public BookingException(String message) {
        super(message);
    }
}
