package com.goevent.dto;

import java.util.List;

/**
 * Public detail page for one approved event. Only stored data is included;
 * there are no tickets, speakers or prices because those flows do not exist yet.
 *
 * <p>{@code dates} holds every scheduled occurrence ({@code yyyy-MM-dd} plus
 * {@code HH:mm - HH:mm}); {@code links} and {@code tags} are the event's own.</p>
 */
public record EventDetails(
        int id,
        String name,
        String description,
        String category,
        String audience,
        String eventLevel,
        Venue venue,
        Organizer organizer,
        String imagePath,
        String bannerPath,
        List<DateSlot> dates,
        List<Link> links,
        List<String> tags,
        int revision
) {

    /** Account that published the event. Email is deliberately not exposed. */
    public record Organizer(String name, String memberSince) {
    }

    /** {@code coordinates} is {@code latitude,longitude} resolved from the saved Google link, or null. */
    public record Venue(String name, String address, String city, String link, String coordinates) {
    }

    public record DateSlot(String date, String time) {
    }

    public record Link(String name, String url) {
    }
}
