package com.goevent.dto;

import java.util.List;
import java.util.Objects;

/**
 * Criteria from the events page. Blank values are dropped, so an empty filter
 * means "every approved event".
 *
 * <p>{@code tags} match an event that has any of the selected tag names.</p>
 */
public record EventFilter(String query, String category, String audience, List<String> tags) {

    private static final int MAX_TEXT = 100;

    public static EventFilter of(String query, String category, String audience, List<String> tags) {
        List<String> cleanTags = tags == null
                ? List.of()
                : tags.stream().map(EventFilter::clean).filter(Objects::nonNull).distinct().toList();

        return new EventFilter(clean(query), clean(category), clean(audience), cleanTags);
    }

    public boolean isEmpty() {
        return query == null && category == null && audience == null && tags.isEmpty();
    }

    private static String clean(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();

        if (trimmed.isEmpty()) {
            return null;
        }

        return trimmed.length() > MAX_TEXT ? trimmed.substring(0, MAX_TEXT) : trimmed;
    }
}