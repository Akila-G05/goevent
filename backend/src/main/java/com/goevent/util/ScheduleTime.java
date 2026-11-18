package com.goevent.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;


public final class ScheduleTime {

    public static final String SEPARATOR = " - ";
    private static final DateTimeFormatter STORED = DateTimeFormatter.ofPattern("HH:mm", Locale.ROOT);
    private static final DateTimeFormatter INPUT = DateTimeFormatter.ofPattern("H:mm", Locale.ROOT);

    private ScheduleTime() {
    }

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

    public static String range(String start, String end) {

        LocalTime from = parse(start);
        LocalTime to = parse(end);

        if (to.equals(from)) {
            throw new IllegalArgumentException("Start and end times cannot be the same");
        }

        return STORED.format(from) + SEPARATOR + STORED.format(to);
    }

    public static LocalDateTime at(LocalDate date, String time) {
        return LocalDateTime.of(date, parse(time));
    }


    public static LocalDateTime endAt(LocalDate date, String start, String end) {
        LocalDateTime startAt = at(date, start);
        LocalDateTime endAt = at(date, end);

        return endAt.isAfter(startAt) ? endAt : endAt.plusDays(1);
    }
}
