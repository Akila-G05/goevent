package com.goevent.enums;

public enum EventSort {
    ASC,
    DESC,
    RANDOM,
    NAME,
    CREATED;

    public static EventSort parse(String value) {
        if (value == null) {
            return ASC;
        }

        return switch (value.trim().toUpperCase()) {
            case "DESC" -> DESC;
            case "RANDOM" -> RANDOM;
            case "NAME" -> NAME;
            case "CREATED" -> CREATED;
            default -> ASC;
        };
    }
}
