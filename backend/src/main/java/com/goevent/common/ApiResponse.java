package com.goevent.common;

import com.goevent.util.AppUtil;
import com.google.gson.JsonObject;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/**
 * Builds the JSON responses used by the API, so the envelope
 * ({@code {status, message, ...}}) and the {@code application/json} content
 * type are defined once instead of being repeated in every service.
 */
public final class ApiResponse {

    private ApiResponse() {
    }

    /** Wraps a prepared body in a JSON response with the given status. */
    public static ResponseEntity<String> json(HttpStatus status, JsonObject body) {
        return ResponseEntity
                .status(status)
                .contentType(MediaType.APPLICATION_JSON)
                .body(AppUtil.gson.toJson(body));
    }

    public static ResponseEntity<String> ok(JsonObject body) {
        return json(HttpStatus.OK, body);
    }

    /** {@code {status: false, message}} for any error status. */
    public static ResponseEntity<String> error(HttpStatus status, String message) {
        JsonObject body = new JsonObject();

        body.addProperty("status", false);
        body.addProperty("message", message);

        return json(status, body);
    }

    public static ResponseEntity<String> unauthorized(String message) {
        return error(HttpStatus.UNAUTHORIZED, message);
    }

    public static ResponseEntity<String> badRequest(String message) {
        return error(HttpStatus.BAD_REQUEST, message);
    }
}