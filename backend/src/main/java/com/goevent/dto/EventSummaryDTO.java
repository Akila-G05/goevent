package com.goevent.dto;

public class EventSummaryDTO {
    private int id;
    private String name;
    private String description;
    private String category;
    private String audience;
    private String eventLevel;
    private String venueName;
    private String venueCity;
    private String imagePath;
    private String startsOn;
    private String timeRange;

    public EventSummaryDTO() {
    }

    public EventSummaryDTO(int id, String name, String description, String category, String audience,
                           String eventLevel, String venueName, String venueCity, String imagePath,
                           String startsOn, String timeRange) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.category = category;
        this.audience = audience;
        this.eventLevel = eventLevel;
        this.venueName = venueName;
        this.venueCity = venueCity;
        this.imagePath = imagePath;
        this.startsOn = startsOn;
        this.timeRange = timeRange;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
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

    public String getEventLevel() {
        return eventLevel;
    }

    public void setEventLevel(String eventLevel) {
        this.eventLevel = eventLevel;
    }

    public String getVenueName() {
        return venueName;
    }

    public void setVenueName(String venueName) {
        this.venueName = venueName;
    }

    public String getVenueCity() {
        return venueCity;
    }

    public void setVenueCity(String venueCity) {
        this.venueCity = venueCity;
    }

    public String getImagePath() {
        return imagePath;
    }

    public void setImagePath(String imagePath) {
        this.imagePath = imagePath;
    }

    public String getStartsOn() {
        return startsOn;
    }

    public void setStartsOn(String startsOn) {
        this.startsOn = startsOn;
    }

    public String getTimeRange() {
        return timeRange;
    }

    public void setTimeRange(String timeRange) {
        this.timeRange = timeRange;
    }
}
