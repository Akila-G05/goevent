package com.goevent.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Registration payload for creating an event.
 *
 * <p>Mirrors the tables written when an event is registered:
 * {@code event}, {@code venue}, {@code link} (+ {@code event_has_links}),
 * {@code event_dates} and {@code event_has_tags}.
 *
 * <p>Columns owned by the server are deliberately not part of this model:
 * <ul>
 *   <li>{@code event.published_by} - taken from the authenticated session, never the client;</li>
 *   <li>{@code event.event_status_id} - starts as {@code APPROVED} (status id 2), so a
 *       listing-only event is usable as soon as it is created;</li>
 *   <li>{@code event.aproved_by} - stays {@code NULL}; no approval step exists yet.</li>
 * </ul>
 *
 * <p>Date and time values are ISO-8601 strings ({@code yyyy-MM-dd}, {@code HH:mm},
 * {@code yyyy-MM-dd'T'HH:mm:ss}) because the project reads payloads with a plain
 * {@link com.google.gson.Gson} instance that has no {@code java.time} adapters registered.
 */
public class EventDTO {

    /** event.name - required, varchar(100). */
    private String name;

    /** event.description - optional, text. */
    private String description;

    /** event.category_id - optional when {@link #categoryName} is supplied. */
    private Integer categoryId;

    /** category.name - resolved case-insensitively, e.g. {@code Technology}. */
    private String categoryName;

    /** event.audience_id - optional when {@link #audienceName} is supplied. */
    private Integer audienceId;

    /** audience.type - resolved case-insensitively, e.g. {@code University}. */
    private String audienceName;

    /** event.event_level_id - required, references event_level.id (LISTING_ONLY/FREE/PAYED). */
    private Integer eventLevelId;

    /** img.path - optional; public image path returned by ImageUploadService. */
    private String imagePath;

    /** img.bannerpath - optional banner for the event. */
    private String bannerPath;

    /** venue row created and linked as event.venue_id. */
    private Venue venue;

    /**
     * link rows created and joined through {@code event_has_links}.
     * An event may publish more than one link, so this is always a list.
     */
    private List<Link> links;

    /** event_dates rows belonging to the event. */
    private List<EventDate> dates;

    /** tags.name values linked through event_has_tags (matched case-insensitively). */
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

    public Venue getVenue() {
        return venue;
    }

    public void setVenue(Venue venue) {
        this.venue = venue;
    }

    public List<Link> getLinks() {
        return links;
    }

    public void setLinks(List<Link> links) {
        this.links = links;
    }

    public List<EventDate> getDates() {
        return dates;
    }

    public void setDates(List<EventDate> dates) {
        this.dates = dates;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
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
     * One external link written to {@code link} and joined to the event.
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
     *
     * <p>The organizer enters a start and an end time; the server joins them
     * into the single {@code event_dates.time} string
     * ({@code "HH:mm - HH:mm"}) because that column is a {@code varchar(45)}.</p>
     */
    public static class EventDate {

        /** event_dates.date - required, ISO-8601 {@code yyyy-MM-dd}. */
        private String date;

        /** Start of the occurrence, {@code HH:mm}. */
        private String startTime;

        /** End of the occurrence, {@code HH:mm}; must be after the start time. */
        private String endTime;

        /** ticket rows for this date; empty for LISTING_ONLY events. */
        private List<Ticket> tickets;

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
