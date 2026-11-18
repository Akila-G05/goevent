package com.goevent.dto;

import java.util.List;
import java.util.Objects;

public class EventFilterDTO {
    private static final int MAX_TEXT = 100;

    private String query;
    private String category;
    private String audience;
    private List<String> tags;

    public EventFilterDTO() {
    }

    public EventFilterDTO(String query, String category, String audience, List<String> tags) {
        this.query = query;
        this.category = category;
        this.audience = audience;
        this.tags = tags;
    }

    public static EventFilterDTO of(String query, String category, String audience, List<String> tags) {
        List<String> cleanTags = tags == null
                ? List.of()
                : tags.stream().map(EventFilterDTO::clean).filter(Objects::nonNull).distinct().toList();

        return new EventFilterDTO(clean(query), clean(category), clean(audience), cleanTags);
    }

    public boolean isEmpty() {
        return query == null && category == null && audience == null && tags.isEmpty();
    }

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getAudience() {
        return audience;
    }

    public void setAudience(String audience) {
        this.audience = audience;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }

        if (!(other instanceof EventFilterDTO that)) {
            return false;
        }

        return Objects.equals(query, that.query)
                && Objects.equals(category, that.category)
                && Objects.equals(audience, that.audience)
                && Objects.equals(tags, that.tags);
    }

    @Override
    public int hashCode() {
        return Objects.hash(query, category, audience, tags);
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
