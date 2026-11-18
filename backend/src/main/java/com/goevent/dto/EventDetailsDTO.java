package com.goevent.dto;

import java.util.List;

public class EventDetailsDTO {
    private int id;
    private String name;
    private String description;
    private String category;
    private String audience;
    private String eventLevel;
    private VenueDTO venue;
    private OrganizerDTO organizer;
    private String imagePath;
    private String bannerPath;
    private List<DateSlotDTO> dates;
    private List<LinkDTO> links;
    private List<String> tags;

    public EventDetailsDTO() {
    }

    public EventDetailsDTO(int id, String name, String description, String category, String audience,
                           String eventLevel, VenueDTO venue, OrganizerDTO organizer, String imagePath,
                           String bannerPath, List<DateSlotDTO> dates, List<LinkDTO> links, List<String> tags) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.category = category;
        this.audience = audience;
        this.eventLevel = eventLevel;
        this.venue = venue;
        this.organizer = organizer;
        this.imagePath = imagePath;
        this.bannerPath = bannerPath;
        this.dates = dates;
        this.links = links;
        this.tags = tags;
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

    public VenueDTO getVenue() {
        return venue;
    }

    public void setVenue(VenueDTO venue) {
        this.venue = venue;
    }

    public OrganizerDTO getOrganizer() {
        return organizer;
    }

    public void setOrganizer(OrganizerDTO organizer) {
        this.organizer = organizer;
    }

    public String getImagePath() {
        return imagePath;
    }

    public void setImagePath(String imagePath) {
        this.imagePath = imagePath;
    }

    public String getBannerPath() {
        return bannerPath;
    }

    public void setBannerPath(String bannerPath) {
        this.bannerPath = bannerPath;
    }

    public List<DateSlotDTO> getDates() {
        return dates;
    }

    public void setDates(List<DateSlotDTO> dates) {
        this.dates = dates;
    }

    public List<LinkDTO> getLinks() {
        return links;
    }

    public void setLinks(List<LinkDTO> links) {
        this.links = links;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public static class OrganizerDTO {
        private String name;
        private String memberSince;

        public OrganizerDTO() {
        }

        public OrganizerDTO(String name, String memberSince) {
            this.name = name;
            this.memberSince = memberSince;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getMemberSince() {
            return memberSince;
        }

        public void setMemberSince(String memberSince) {
            this.memberSince = memberSince;
        }
    }

    public static class VenueDTO {
        private String name;
        private String address;
        private String city;
        private String link;
        private String coordinates;

        public VenueDTO() {
        }

        public VenueDTO(String name, String address, String city, String link, String coordinates) {
            this.name = name;
            this.address = address;
            this.city = city;
            this.link = link;
            this.coordinates = coordinates;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getAddress() {
            return address;
        }

        public void setAddress(String address) {
            this.address = address;
        }

        public String getCity() {
            return city;
        }

        public void setCity(String city) {
            this.city = city;
        }

        public String getLink() {
            return link;
        }

        public void setLink(String link) {
            this.link = link;
        }

        public String getCoordinates() {
            return coordinates;
        }

        public void setCoordinates(String coordinates) {
            this.coordinates = coordinates;
        }
    }

    public static class DateSlotDTO {
        private String date;
        private String time;

        public DateSlotDTO() {
        }

        public DateSlotDTO(String date, String time) {
            this.date = date;
            this.time = time;
        }

        public String getDate() {
            return date;
        }

        public void setDate(String date) {
            this.date = date;
        }

        public String getTime() {
            return time;
        }

        public void setTime(String time) {
            this.time = time;
        }
    }

    public static class LinkDTO {
        private String name;
        private String url;

        public LinkDTO() {
        }

        public LinkDTO(String name, String url) {
            this.name = name;
            this.url = url;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }
    }
}
