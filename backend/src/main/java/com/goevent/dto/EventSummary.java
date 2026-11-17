package com.goevent.dto;

/**
 * Public card shown on the home page. Carries only what a visitor needs to
 * decide whether they can join: the audience, the free/paid/listing-only level,
 * and the first upcoming date.
 *
 * <p>{@code audience} is {@code UNIVERSITY}, {@code PUBLIC} or {@code BOTH};
 * {@code eventLevel} is {@code LISTING_ONLY}, {@code FREE} or {@code PAYED}.
 * {@code startsOn} is {@code yyyy-MM-dd} and {@code timeRange} is
 * {@code HH:mm - HH:mm}.</p>
 */
public record EventSummary(
        int id,
        String name,
        String description,
        String category,
        String audience,
        String eventLevel,
        String venueName,
        String venueCity,
        String imagePath,
        String startsOn,
        String timeRange
) {
}
