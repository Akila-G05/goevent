package com.goevent.dto;

import java.math.BigDecimal;
import java.util.List;

public class EventDTO {
    private String name;
    private String description;
    private Integer categoryId;
    private Integer audienceId;
    private Integer eventLevelId;
    private String imagePath;
    private String bannerPath;
    private Venue venue;
    private Link link;
    private List<EventDate> dates;
    private List<Integer> tagIds;

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

    public Integer getAudienceId() {
        return audienceId;
    }

    public void setAudienceId(Integer audienceId) {
        this.audienceId = audienceId;
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

    public Venue getVenue() {
        return venue;
    }

    public void setVenue(Venue venue) {
        this.venue = venue;
    }

    public Link getLink() {
        return link;
    }

    public void setLink(Link link) {
        this.link = link;
    }

    public List<EventDate> getDates() {
        return dates;
    }

    public void setDates(List<EventDate> dates) {
        this.dates = dates;
    }

    public List<Integer> getTagIds() {
        return tagIds;
    }

    public void setTagIds(List<Integer> tagIds) {
        this.tagIds = tagIds;
    }

    public static class Venue {
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

    public static class Link {

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

    public static class EventDate {

        private String date;
        private String time;
        private List<Ticket> tickets;

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

        public List<Ticket> getTickets() {
            return tickets;
        }

        public void setTickets(List<Ticket> tickets) {
            this.tickets = tickets;
        }
    }

    public static class Ticket {
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
