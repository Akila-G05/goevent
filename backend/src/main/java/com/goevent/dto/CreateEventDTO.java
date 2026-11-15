package com.goevent.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Registration payload for creating an event.
 *
 * <p>Mirrors the tables written when an event is registered:
 * {@code event}, {@code venue}, {@code link}, {@code img}, {@code event_dates},
 * {@code event_has_tags} and {@code ticket}.
 *
 * <p>Columns owned by the server are deliberately not part of this model:
 * <ul>
 *   <li>{@code event.published_by} - taken from the authenticated session, never the client;</li>
 *   <li>{@code event.event_status_id} - starts as {@code PENDING} (status id 1);</li>
 *   <li>{@code event.aproved_by} - stays {@code 0} until an administrator moderates the event.</li>
 * </ul>
 *
 * <p>Date and time values are ISO-8601 strings ({@code yyyy-MM-dd}, {@code HH:mm},
 * {@code yyyy-MM-dd'T'HH:mm:ss}) because the project reads payloads with a plain
 * {@link com.google.gson.Gson} instance that has no {@code java.time} adapters registered.
 */
public class CreateEventDTO {

    /** event.name - required, varchar(100). */
    private String name;

    /** event.description - optional, text. */
    private String description;

    /** event.category_id - required, references category.id. */
    private Integer categoryId;

    /** event.audience_id - required, references audience.id (UNIVERSITY/PUBLIC/BOTH). */
    private Integer audienceId;

    /** event.event_level_id - required, references event_level.id (LISTING_ONLY/FREE/PAYED). */
    private Integer eventLevelId;

    /** img.path - required; public image path returned by ImageUploadService. */
    private String imagePath;

    /** img.bannerpath - optional banner for the event. */
    private String bannerPath;

    /** venue row created and linked as event.venue_id. */
    private Venue venue;

    /** link row created and linked as event.link_id. */
    private Link link;

    /** event_dates rows (and their tickets) belonging to the event. */
    private List<EventDate> dates;

    /** tags.id values linked through event_has_tags. */
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

    /**
     * Location written to {@code venue} before the event row is inserted.
     * {@code name} and {@code city} are required by the schema.
     */
    public static class Venue {

        /** venue.name - required, varchar(45). */
        private String name;

        /** venue.address - optional, varchar(150). */
        private String address;

        /** venue.city - required, varchar(45). */
        private String city;

        /** venue.link - optional map or venue page, varchar(150). */
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

    /**
     * External link written to {@code link} before the event row is inserted.
     * Both columns are required by the schema.
     */
    public static class Link {

        /** link.link_name - required, varchar(45). */
        private String name;

        /** link.link - required, varchar(200). */
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

    /**
     * One occurrence of the event, written to {@code event_dates}.
     * Tickets reference the generated {@code event_dates.id}.
     */
    public static class EventDate {

        /** event_dates.date - required, ISO-8601 {@code yyyy-MM-dd}. */
        private String date;

        /** event_dates.time - required, {@code HH:mm} (column is varchar(45)). */
        private String time;

        /** ticket rows sold for this date; empty for LISTING_ONLY and FREE events. */
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

    /**
     * A ticket tier sold for one {@link EventDate}, written to {@code ticket}.
     * The schema has no currency column; amounts are in the platform currency.
     */
    public static class Ticket {

        /** ticket.qty - required, available stock. */
        private Integer quantity;

        /** ticket.price - required; zero for free tiers. */
        private BigDecimal price;

        /** ticket.description - optional, text. */
        private String description;

        /** ticket.sale_start_at - required, ISO-8601 {@code yyyy-MM-dd'T'HH:mm:ss}. */
        private String saleStartAt;

        /** ticket.sale_end_at - required, ISO-8601 {@code yyyy-MM-dd'T'HH:mm:ss}. */
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
