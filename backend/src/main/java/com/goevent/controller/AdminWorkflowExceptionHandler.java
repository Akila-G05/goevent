package com.goevent.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.dao.DataAccessException;
import java.util.Map;

@RestControllerAdvice(assignableTypes={AdminController.class,AdminAuthenticationController.class,CoordinatorRequestController.class,ContactController.class})
public class AdminWorkflowExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> rejected(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("status",false,"message",error.getReason()==null?"Request rejected":error.getReason()));
    }
    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<?> databaseFailure() {
        return ResponseEntity.status(503).body(Map.of("status",false,"message","Operation unavailable; refresh before retrying"));
    }
}
