package com.goevent.dto;

import java.math.BigDecimal;
import java.util.List;

public class EventDTO {
    private String name;
    private String description;
    private Integer categoryId;
    private String categoryName;
    private Integer audienceId;
    private String audienceName;
    private Integer eventLevelId;
    private String imagePath;
    private String bannerPath;
    private VenueDTO venue;
    private List<LinkDTO> links;
    private List<EventDateDTO> dates;
    private List<String> tags;

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

    public Integer getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Integer categoryId) {
        this.categoryId = categoryId;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
    }

    public Integer getAudienceId() {
        return audienceId;
    }

    public void setAudienceId(Integer audienceId) {
        this.audienceId = audienceId;
    }

    public String getAudienceName() {
        return audienceName;
    }

    public void setAudienceName(String audienceName) {
        this.audienceName = audienceName;
    }

    public Integer getEventLevelId() {
        return eventLevelId;
    }

    public void setEventLevelId(Integer eventLevelId) {
        this.eventLevelId = eventLevelId;
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

    public VenueDTO getVenue() {
        return venue;
    }

    public void setVenue(VenueDTO venue) {
        this.venue = venue;
    }

    public List<LinkDTO> getLinks() {
        return links;
    }

    public void setLinks(List<LinkDTO> links) {
        this.links = links;
    }

    public List<EventDateDTO> getDates() {
        return dates;
    }

    public void setDates(List<EventDateDTO> dates) {
        this.dates = dates;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public static class VenueDTO {
        private String name;
        private String address;
        private String city;
        private String link;

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
    }

    public static class LinkDTO {
        private String name;
        private String url;

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

    public static class EventDateDTO {
        private String date;
        private String startTime;
        private String endTime;
        private List<TicketDTO> tickets;

        public String getDate() {
            return date;
        }

        public void setDate(String date) {
            this.date = date;
        }

        public String getStartTime() {
            return startTime;
        }

        public void setStartTime(String startTime) {
            this.startTime = startTime;
        }

        public String getEndTime() {
            return endTime;
        }

        public void setEndTime(String endTime) {
            this.endTime = endTime;
        }

        public List<TicketDTO> getTickets() {
            return tickets;
        }

        public void setTickets(List<TicketDTO> tickets) {
            this.tickets = tickets;
        }
    }

    public static class TicketDTO {
        private Integer quantity;
        private BigDecimal price;
        private String description;
        private String saleStartAt;
        private String saleEndAt;

        public Integer getQuantity() {
            return quantity;
        }

        public void setQuantity(Integer quantity) {
            this.quantity = quantity;
        }

        public BigDecimal getPrice() {
            return price;
        }

        public void setPrice(BigDecimal price) {
            this.price = price;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public String getSaleStartAt() {
            return saleStartAt;
        }

        public void setSaleStartAt(String saleStartAt) {
            this.saleStartAt = saleStartAt;
        }

        public String getSaleEndAt() {
            return saleEndAt;
        }

        public void setSaleEndAt(String saleEndAt) {
            this.saleEndAt = saleEndAt;
        }
    }
}
