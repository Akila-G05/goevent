package com.goevent.dto;

public class OwnedEventSummaryDTO {
    private int id;
    private String name;
    private String category;
    private String audience;
    private String eventLevel;
    private String status;
    private String venueName;
    private String venueCity;
    private String imagePath;
    private String startsOn;
    private String timeRange;

    public OwnedEventSummaryDTO() {
    }

    public OwnedEventSummaryDTO(int id, String name, String category, String audience, String eventLevel,
                                String status, String venueName, String venueCity, String imagePath,
                                String startsOn, String timeRange) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.audience = audience;
        this.eventLevel = eventLevel;
        this.status = status;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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
