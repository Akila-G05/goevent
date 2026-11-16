package com.goevent.exception;

public class EventNotFoundException extends GoEventException {

    public EventNotFoundException(int eventId) {
        super("Event #" + eventId + " was not found.");
    }
}
