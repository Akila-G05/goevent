package com.goevent.exception;

/** Raised when a viewer asks for more tickets of one type than are left. */
public class InsufficientStockException extends BookingException {

    public InsufficientStockException(String ticketName, int requested, int remaining) {
        super("Only " + remaining + " '" + ticketName + "' ticket(s) left, but " + requested + " were requested.");
    }
}
