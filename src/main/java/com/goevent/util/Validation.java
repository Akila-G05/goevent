package com.goevent.util;

import com.goevent.exception.ValidationException;

public final class Validation {

    private Validation() {
    }

    public static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new ValidationException(field + " is required.");
        }
        return value.trim();
    }

    public static int requirePositive(int value, String field) {
        if (value < 1) {
            throw new ValidationException(field + " must be at least 1.");
        }
        return value;
    }
}
