package com.goevent.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;

/**
 * Converts the start and end clock times an organizer enters into the single
 * string stored in {@code event_dates.time}.
 *
 * <p>The schema keeps that column as {@code varchar(45)}, so the platform
 * stores a normalized {@code "HH:mm - HH:mm"} range instead of adding columns.
 * Parsing is strict: only real 24-hour clock values are accepted.</p>
 */
public final class ScheduleTime {

    /** Separator used between the two times, e.g. {@code 18:00 - 22:00}. */
    public static final String SEPARATOR = " - ";

    private static final DateTimeFormatter STORED =
            DateTimeFormatter.ofPattern("HH:mm", Locale.ROOT);

    private static final DateTimeFormatter INPUT =
            DateTimeFormatter.ofPattern("H:mm", Locale.ROOT);

    private ScheduleTime() {
    }

    /** Parses {@code H:mm} or {@code HH:mm}; throws {@link IllegalArgumentException}. */
    public static LocalTime parse(String value) {

        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Start and end times are required");
        }

        try {
            return LocalTime.parse(value.trim(), INPUT);
        } catch (DateTimeParseException error) {
            throw new IllegalArgumentException("Time must use HH:mm");
        }
    }

    /** Normalizes and validates a range, e.g. {@code "18:00 - 22:00"}. */
    public static String range(String start, String end) {

        LocalTime from = parse(start);
        LocalTime to = parse(end);

        if (to.equals(from)) {
            throw new IllegalArgumentException("Start and end times cannot be the same");
        }

        return STORED.format(from) + SEPARATOR + STORED.format(to);
    }

    /** Combines a date and a clock time; throws {@link IllegalArgumentException}. */
    public static LocalDateTime at(LocalDate date, String time) {
        return LocalDateTime.of(date, parse(time));
    }

    /**
     * End of an occurrence that starts on {@code date}. An end earlier than the
     * start means the event runs past midnight, so it ends on the next day
     * (for example 19:00 - 02:00 ends at 02:00 the following morning).
     */
    public static LocalDateTime endAt(LocalDate date, String start, String end) {
        LocalDateTime startAt = at(date, start);
        LocalDateTime endAt = at(date, end);

        return endAt.isAfter(startAt) ? endAt : endAt.plusDays(1);
    }
}
