package com.goevent.controller;

import com.goevent.exception.EventException;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Turns event failures into the {@code {status, message}} envelope used by the
 * rest of the API. Only {@link EventController} is covered so unrelated
 * controllers keep their existing error handling.
 */
@RestControllerAdvice(assignableTypes = EventController.class)
public class EventExceptionHandler {

    @ExceptionHandler(EventException.class)
    ResponseEntity<Map<String, Object>> rejected(EventException error) {
        return ResponseEntity.status(error.status())
                .body(Map.of("status", false, "message", error.getMessage()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Map<String, Object>> unreadable() {
        return ResponseEntity.badRequest()
                .body(Map.of("status", false, "message", "The event payload could not be read."));
    }

    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<Map<String, Object>> databaseFailure() {
        return ResponseEntity.status(503)
                .body(Map.of("status", false, "message",
                        "The event could not be saved. Please try again."));
    }
}
