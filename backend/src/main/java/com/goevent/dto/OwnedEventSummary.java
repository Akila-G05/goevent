package com.goevent.dto;

/**
 * One event in the organizer's own list. Unlike the public card, it carries the
 * review {@code status} (PENDING, APPROVED, REJECTED or DRAFT) and is returned
 * for every state so the organizer can see and edit what they published.
 */
public record OwnedEventSummary(
        int id,
        String name,
        String category,
        String audience,
        String eventLevel,
        String status,
        String venueName,
        String venueCity,
        String imagePath,
        String startsOn,
        String timeRange
) {
}
