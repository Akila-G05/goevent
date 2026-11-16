package com.goevent.enums;

/** Ordering for public event lists. Values come from the query string and are parsed here. */
public enum EventSort {

    /** Earliest upcoming date first. */
    ASC,

    /** Latest upcoming date first. */
    DESC,

    /** Random order, used for browsing when no personal scope applies. */
    RANDOM,

    /** Alphabetical by event name. */
    NAME,

    /** Most recently added first, used for the home-page browsing list. */
    CREATED;

    /** Unknown or missing values fall back to {@link #ASC}. */
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
