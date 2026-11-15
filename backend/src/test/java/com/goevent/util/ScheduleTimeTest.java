package com.goevent.util;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ScheduleTimeTest {

    @Test
    void joinsStartAndEndIntoTheStoredColumnFormat() {
        assertEquals("18:00 - 22:00", ScheduleTime.range("18:00", "22:00"));
    }

    @Test
    void normalizesSingleDigitHours() {
        assertEquals("09:05 - 10:30", ScheduleTime.range("9:05", "10:30"));
    }

    @Test
    void rejectsAnEndBeforeTheStart() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> ScheduleTime.range("22:00", "18:00"));

        assertTrue(error.getMessage().contains("after the start"));
    }

    @Test
    void rejectsAnEndEqualToTheStart() {
        assertThrows(IllegalArgumentException.class, () -> ScheduleTime.range("18:00", "18:00"));
    }

    @Test
    void rejectsNonClockValues() {
        assertThrows(IllegalArgumentException.class, () -> ScheduleTime.range("morning", "22:00"));
        assertThrows(IllegalArgumentException.class, () -> ScheduleTime.range("25:00", "26:00"));
        assertThrows(IllegalArgumentException.class, () -> ScheduleTime.range("", "22:00"));
    }

    @Test
    void combinesDateAndTimeForTheEventWindow() {
        LocalDateTime value = ScheduleTime.at(LocalDate.of(2026, 12, 24), "18:30");

        assertEquals(LocalDateTime.of(2026, 12, 24, 18, 30), value);
    }
}
