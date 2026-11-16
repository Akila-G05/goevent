package com.goevent.service;

import com.goevent.config.FileStorageConfig;
import com.goevent.dto.EventDTO;
import com.goevent.dto.EventDetails;
import com.goevent.dto.EventSummary;
import com.goevent.dto.OwnedEventSummary;
import com.goevent.enums.EventSort;
import com.goevent.enums.Role;
import com.goevent.enums.Status;
import com.goevent.enums.UserStatus;
import com.goevent.exception.EventException;
import com.goevent.repository.EventRepo;
import com.goevent.util.AppUtil;
import com.goevent.util.ScheduleTime;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Optional;
import java.util.List;
import java.util.Map;

@Service
public class EventService {

    private static final Logger logger = AppUtil.getLogger(EventService.class);

    private static final int LISTING_ONLY = 1;
    private static final int MAX_LINKS = 10;
    private static final int MAX_DATES = 30;
    private static final int MAX_TAGS = 20;
    private static final ZoneId UTC = ZoneId.of("UTC");

    private static final int MAX_LIST_SIZE = 50;

    private final EventRepo eventRepo;
    private final ImageUploadService imageUploadService;
    private final MapLinkResolver mapLinks;

    public EventService(EventRepo eventRepo, ImageUploadService imageUploadService, MapLinkResolver mapLinks) {
        this.eventRepo = eventRepo;
        this.imageUploadService = imageUploadService;
        this.mapLinks = mapLinks;
    }

    @Transactional
    public long create(EventDTO input, HttpServletRequest httpRequest) {

        int actor = requireOrganizer(httpRequest);
        Prepared event = prepare(input);

        long venueId = eventRepo.insertVenue(event.venueName(), event.venueAddress(), event.venueCity(), event.venueLink());
        List<Long> linkIds = insertLinks(event.links());

        long eventId = eventRepo.insertEvent(
                event.name(),
                event.description(),
                event.categoryId(),
                venueId,
                Status.APPROVED.getId(),
                event.audienceId(),
                LISTING_ONLY,
                linkIds.isEmpty() ? null : linkIds.get(0),
                actor,
                startsAt(event),
                endsAt(event));

        for (long linkId : linkIds) {
            eventRepo.linkEvent(eventId, linkId);
        }

        writeSchedule(eventId, event);
        writeTags(eventId, event);

        logger.info("Created listing event {} for user {} ({} dates, {} links, {} tags).",
                eventId, actor, event.schedules().size(), linkIds.size(), event.tagIds().size());

        return eventId;
    }

    /**
     * Replaces an event's listing details. The owner or an administrator may edit.
     * The review status is kept, so an approved event stays visible while it is edited.
     */
    @Transactional
    public long update(long eventId, EventDTO input, HttpServletRequest httpRequest) {

        int actor = requireOrganizer(httpRequest);
        Map<String, Object> owner = requireOwnedEvent(eventId, actor);
        Prepared event = prepare(input);

        eventRepo.updateVenue(number(owner, "venue_id"), event.venueName(), event.venueAddress(),
                event.venueCity(), event.venueLink());

        List<Long> previousLinks = eventRepo.eventLinkIds(eventId);
        eventRepo.clearEventLinks(eventId);
        List<Long> linkIds = insertLinks(event.links());

        for (long linkId : linkIds) {
            eventRepo.linkEvent(eventId, linkId);
        }

        for (long linkId : previousLinks) {
            eventRepo.deleteLinkIfUnused(linkId);
        }

        eventRepo.updateEvent(eventId, event.name(), event.description(), event.categoryId(),
                event.audienceId(), startsAt(event), endsAt(event),
                linkIds.isEmpty() ? null : linkIds.get(0));

        eventRepo.clearEventDates(eventId);
        writeSchedule(eventId, event);

        eventRepo.clearEventTags(eventId);
        writeTags(eventId, event);

        logger.info("Updated listing event {} by user {}.", eventId, actor);

        return eventId;
    }

    /** Every event the signed-in organizer published, in any review state. */
    @Transactional(readOnly = true)
    public List<OwnedEventSummary> mine(HttpServletRequest httpRequest) {

        int actor = requireOrganizer(httpRequest);

        return eventRepo.ownedEventRows(actor).stream()
                .map(EventService::owned)
                .toList();
    }

    /** Full detail of one of the organizer's own events, whatever its review state. */
    @Transactional(readOnly = true)
    public EventDetails ownerDetail(long eventId, HttpServletRequest httpRequest) {

        int actor = requireOrganizer(httpRequest);
        requireOwnedEvent(eventId, actor);

        Map<String, Object> row = eventRepo.eventRowById(eventId);

        if (row == null) {
            throw EventException.notFound("Event not found.");
        }

        return toDetails(eventId, row);
    }

    /** Event row and owner check: the owner or an administrator only. */
    private Map<String, Object> requireOwnedEvent(long eventId, int actor) {

        Map<String, Object> owner = eventRepo.eventOwnerRow(eventId);

        if (owner == null) {
            throw EventException.notFound("Event not found.");
        }

        if (number(owner, "published_by") != actor && !isAdmin(actor)) {
            throw EventException.forbidden("You can only change your own events.");
        }

        return owner;
    }

    /** Validates a submission once, for both create and update. */
    private Prepared prepare(EventDTO input) {

        if (input == null) {
            throw EventException.badRequest("Event details are required.");
        }

        requireListingOnly(input.getEventLevelId());

        String name = required(input.getName(), 100, "Event name");
        String description = optional(input.getDescription(), 5000, "Description");
        int categoryId = resolveCategory(input);
        int audienceId = resolveAudience(input);

        EventDTO.Venue venueInput = input.getVenue();

        if (venueInput == null) {
            throw EventException.badRequest("Venue details are required.");
        }

        String venueName = required(venueInput.getName(), 45, "Venue name");
        String venueCity = required(venueInput.getCity(), 45, "Venue city");
        String venueAddress = optional(venueInput.getAddress(), 150, "Venue address");
        String venueLink = optionalUrl(venueInput.getLink(), 150, "Map link");

        return new Prepared(
                name,
                description,
                categoryId,
                audienceId,
                venueName,
                venueAddress,
                venueCity,
                venueLink,
                validLinks(input.getLinks()),
                validSchedules(input.getDates()),
                resolveTags(input.getTags()));
    }

    private List<Long> insertLinks(List<LinkRow> links) {

        List<Long> linkIds = new ArrayList<>();

        for (LinkRow link : links) {
            linkIds.add(eventRepo.insertLink(link.name(), link.url()));
        }

        return linkIds;
    }

    private void writeSchedule(long eventId, Prepared event) {

        for (Schedule schedule : event.schedules()) {
            eventRepo.insertEventDate(eventId, schedule.date(), schedule.timeRange());
        }
    }

    private void writeTags(long eventId, Prepared event) {

        for (int tagId : event.tagIds()) {
            eventRepo.attachTag(eventId, tagId);
        }
    }

    private static LocalDateTime startsAt(Prepared event) {
        return event.schedules().get(0).start();
    }

    private static LocalDateTime endsAt(Prepared event) {
        return event.schedules().get(event.schedules().size() - 1).end();
    }
    /**
     * Stores the event's cover image (and an optional banner) and points
     * {@code event.img_id} at the resulting {@code img} row. The owner of the
     * event, or an administrator, may upload.
     */
    @Transactional
    public Map<String, Object> attachImage(
            long eventId,
            MultipartFile image,
            MultipartFile banner,
            HttpServletRequest httpRequest
    ) {

        int actor = requireOrganizer(httpRequest);

        Map<String, Object> eventRow = eventRepo.eventImageRow(eventId);

        if (eventRow == null) {
            throw EventException.notFound("Event not found.");
        }

        if (number(eventRow, "published_by") != actor && !isAdmin(actor)) {
            throw EventException.forbidden("You can only add images to your own events.");
        }

        String imagePath = imageUploadService.uploadEventImage((int) eventId, image);
        String bannerPath = banner == null || banner.isEmpty()
                ? null
                : imageUploadService.uploadEventBanner((int) eventId, banner);

        try {
            Object existing = eventRow.get("img_id");

            if (existing instanceof Number imageId) {
                eventRepo.updateImage(imageId.longValue(), imagePath, bannerPath);
            } else {
                eventRepo.setEventImage(eventId, eventRepo.insertImage(imagePath, bannerPath));
            }
        } catch (RuntimeException error) {
            // The files are already written; remove them so a failed write leaves nothing behind.
            imageUploadService.deleteByPath(FileStorageConfig.SCOPE_EVENT, imagePath);

            if (bannerPath != null) {
                imageUploadService.deleteByPath(FileStorageConfig.SCOPE_BANNER, bannerPath);
            }

            throw error;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", true);
        result.put("imagePath", imagePath);

        if (bannerPath != null) {
            result.put("bannerPath", bannerPath);
        }

        logger.info("Stored the image for event {} (uploaded by user {}).", eventId, actor);

        return result;
    }

    /** Public listing: approved events only, capped so one request stays bounded. */
    @Transactional(readOnly = true)
    public List<EventSummary> listApproved(int limit, EventSort sort) {

        int size = clampSize(limit);

        return eventRepo.approvedEvents(Status.APPROVED.getId(), sort, size).stream()
                .map(EventService::summary)
                .toList();
    }

    /**
     * Browsing list for the home page. A signed-in student sees approved events
     * published by students of their university, earliest first. Everyone else,
     * including anonymous visitors and organizers, gets a random selection.
     */
    @Transactional(readOnly = true)
    public List<EventSummary> recommended(int limit, HttpServletRequest httpRequest) {

        int size = clampSize(limit);
        Optional<Integer> universityId = studentUniversityId(httpRequest);

        if (universityId.isPresent()) {
            return eventRepo.approvedEventsForUniversity(Status.APPROVED.getId(), universityId.get(), size).stream()
                    .map(EventService::summary)
                    .toList();
        }

        return eventRepo.approvedEvents(Status.APPROVED.getId(), EventSort.DESC, size).stream()
                .map(EventService::summary)
                .toList();
    }

    private Optional<Integer> studentUniversityId(HttpServletRequest httpRequest) {

        HttpSession session = httpRequest == null ? null : httpRequest.getSession(false);
        Object sessionUser = session == null ? null : session.getAttribute("userId");

        if (!(sessionUser instanceof Integer userId)) {
            return Optional.empty();
        }

        Map<String, Object> account = eventRepo.account(userId);

        if (account == null || number(account, "role_id") != Role.STUDENT.getId()) {
            return Optional.empty();
        }

        return eventRepo.studentUniversityId(userId);
    }

    private static int clampSize(int limit) {
        return Math.max(1, Math.min(limit, MAX_LIST_SIZE));
    }

    /** Public detail: approved events only; anything else is reported as not found. */
    @Transactional(readOnly = true)
    public EventDetails detail(long eventId) {

        Map<String, Object> row = eventRepo.approvedEventRow(eventId, Status.APPROVED.getId());

        if (row == null) {
            throw EventException.notFound("Event not found.");
        }

        return toDetails(eventId, row);
    }

    private EventDetails toDetails(long eventId, Map<String, Object> row) {

        List<EventDetails.DateSlot> dates = eventRepo.eventDateRows(eventId).stream()
                .map(date -> new EventDetails.DateSlot(text(date, "date"), text(date, "time")))
                .toList();

        List<EventDetails.Link> links = eventRepo.eventLinkRows(eventId).stream()
                .map(link -> new EventDetails.Link(text(link, "link_name"), text(link, "link")))
                .toList();

        EventDetails.Venue venue = new EventDetails.Venue(
                text(row, "venue_name"),
                text(row, "venue_address"),
                text(row, "venue_city"),
                text(row, "venue_link"),
                mapLinks.coordinatesFor(text(row, "venue_link")).orElse(null)
        );

        return new EventDetails(
                number(row, "id"),
                text(row, "name"),
                text(row, "description"),
                text(row, "category"),
                text(row, "audience"),
                text(row, "event_level"),
                venue,
                new EventDetails.Organizer(text(row, "organizer_name"), text(row, "organizer_since")),
                text(row, "image_path"),
                text(row, "banner_path"),
                dates,
                links,
                eventRepo.eventTagNames(eventId));
    }

    private static OwnedEventSummary owned(Map<String, Object> row) {
        return new OwnedEventSummary(
                number(row, "id"),
                text(row, "name"),
                text(row, "category"),
                text(row, "audience"),
                text(row, "event_level"),
                text(row, "status"),
                text(row, "venue_name"),
                text(row, "venue_city"),
                text(row, "image_path"),
                text(row, "starts_on"),
                text(row, "time_range"));
    }
    private static EventSummary summary(Map<String, Object> row) {
        return new EventSummary(
                number(row, "id"),
                text(row, "name"),
                text(row, "description"),
                text(row, "category"),
                text(row, "audience"),
                text(row, "event_level"),
                text(row, "venue_name"),
                text(row, "venue_city"),
                text(row, "image_path"),
                text(row, "starts_on"),
                text(row, "time_range"));
    }

    private boolean isAdmin(int userId) {
        Map<String, Object> account = eventRepo.account(userId);
        return account != null && number(account, "role_id") == Role.ADMIN.getId();
    }

    // --- authorisation ---------------------------------------------------

    private int requireOrganizer(HttpServletRequest httpRequest) {

        HttpSession session = httpRequest == null ? null : httpRequest.getSession(false);
        Object sessionUser = session == null ? null : session.getAttribute("userId");

        if (!(sessionUser instanceof Integer userId)) {
            throw EventException.unauthorized("Sign in as an organizer to create an event.");
        }

        Map<String, Object> account = eventRepo.account(userId);

        if (account == null) {
            throw EventException.unauthorized("Your account could not be found. Sign in again.");
        }

        int status = number(account, "user_status_id");
        int role = number(account, "role_id");

        if (status != UserStatus.ACTIVE.getId()) {
            throw EventException.forbidden("This account is not active.");
        }

        if (role != Role.ORGANIZER.getId() && role != Role.ADMIN.getId()) {
            throw EventException.forbidden("Only organizers can create events.");
        }

        return userId;
    }

    private static void requireListingOnly(Integer eventLevelId) {

        if (eventLevelId == null) {
            throw EventException.badRequest("Choose the event type.");
        }

        if (eventLevelId != LISTING_ONLY) {
            throw EventException.badRequest(
                    "Free and paid ticketing are coming soon. Create a listing-only event for now.");
        }
    }

    // --- validation ------------------------------------------------------

    private int resolveCategory(EventDTO input) {

        if (input.getCategoryId() != null) {

            if (!eventRepo.categoryExists(input.getCategoryId())) {
                throw EventException.badRequest("Unknown category.");
            }

            return input.getCategoryId();
        }

        String name = required(input.getCategoryName(), 45, "Category");

        return eventRepo.categoryId(name)
                .orElseThrow(() -> EventException.badRequest("Unknown category: " + name));
    }

    private int resolveAudience(EventDTO input) {

        if (input.getAudienceId() != null) {

            if (!eventRepo.audienceExists(input.getAudienceId())) {
                throw EventException.badRequest("Unknown audience.");
            }

            return input.getAudienceId();
        }

        String name = required(input.getAudienceName(), 45, "Audience");

        return eventRepo.audienceId(name).orElseThrow(() -> EventException.badRequest("Unknown audience: " + name));
    }

    private List<LinkRow> validLinks(List<EventDTO.Link> links) {

        if (links == null || links.isEmpty()) {
            return List.of();
        }

        if (links.size() > MAX_LINKS) {
            throw EventException.badRequest("Add at most " + MAX_LINKS + " links.");
        }

        List<LinkRow> valid = new ArrayList<>();

        for (int index = 0; index < links.size(); index++) {

            EventDTO.Link link = links.get(index);
            String label = "Link " + (index + 1);

            if (link == null) {
                throw EventException.badRequest(label + " is empty.");
            }

            String name = required(link.getName(), 45, label + " label");
            String url = required(link.getUrl(), 200, label + " URL");

            requireHttpUrl(url, label + " URL");

            valid.add(new LinkRow(name, url));
        }

        return valid;
    }

    private List<Schedule> validSchedules(List<EventDTO.EventDate> dates) {

        if (dates == null || dates.isEmpty()) {
            throw EventException.badRequest("Add at least one date to the schedule.");
        }

        if (dates.size() > MAX_DATES) {
            throw EventException.badRequest("Add at most " + MAX_DATES + " dates.");
        }

        LocalDate today = LocalDate.now(UTC);
        List<Schedule> schedules = new ArrayList<>();

        for (int index = 0; index < dates.size(); index++) {

            EventDTO.EventDate row = dates.get(index);
            String label = "Schedule row " + (index + 1);

            if (row == null) {
                throw EventException.badRequest(label + " is empty.");
            }

            String rawDate = required(row.getDate(), 10, label + " date");

            LocalDate date;

            try {
                date = LocalDate.parse(rawDate);
            } catch (DateTimeParseException error) {
                throw EventException.badRequest(label + " date must use yyyy-MM-dd.");
            }

            if (date.isBefore(today)) {
                throw EventException.badRequest(label + " date cannot be in the past.");
            }

            String timeRange;
            LocalDateTime start;
            LocalDateTime end;

            try {
                timeRange = ScheduleTime.range(row.getStartTime(), row.getEndTime());
                start = ScheduleTime.at(date, row.getStartTime());
                end = ScheduleTime.at(date, row.getEndTime());
            } catch (IllegalArgumentException error) {
                throw EventException.badRequest(label + ": " + error.getMessage());
            }

            schedules.add(new Schedule(date, start, end, timeRange));
        }

        // The event-level window is the earliest start and the latest end.
        schedules.sort(Comparator.comparing(Schedule::start));

        return schedules;
    }

    private List<Integer> resolveTags(List<String> tags) {

        if (tags == null || tags.isEmpty()) {
            return List.of();
        }

        if (tags.size() > MAX_TAGS) {
            throw EventException.badRequest("Choose at most " + MAX_TAGS + " tags.");
        }

        List<Integer> ids = new ArrayList<>();

        for (String tag : tags) {

            String name = required(tag, 45, "Tag");

            eventRepo.tagId(name).ifPresent(id -> {
                if (!ids.contains(id)) {
                    ids.add(id);
                }
            });
        }

        return ids;
    }

    // --- field helpers ---------------------------------------------------

    private static String required(String value, int max, String field) {

        if (value == null || value.isBlank()) {
            throw EventException.badRequest(field + " is required.");
        }

        String trimmed = value.trim();

        if (trimmed.length() > max) {
            throw EventException.badRequest(field + " must be " + max + " characters or fewer.");
        }

        return trimmed;
    }

    private static String optional(String value, int max, String field) {

        if (value == null || value.isBlank()) {
            return null;
        }

        String trimmed = value.trim();

        if (trimmed.length() > max) {
            throw EventException.badRequest(field + " must be " + max + " characters or fewer.");
        }

        return trimmed;
    }

    private static String optionalUrl(String value, int max, String field) {
        String url = optional(value, max, field);

        if (url != null) {
            requireHttpUrl(url, field);
        }

        return url;
    }

    private static void requireHttpUrl(String value, String field) {

        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme();

            boolean http = "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);

            if (!http || uri.getHost() == null) {
                throw EventException.badRequest(field + " must be a full http(s) link.");
            }
        } catch (IllegalArgumentException error) {
            throw EventException.badRequest(field + " must be a full http(s) link.");
        }
    }

        private static String text(Map<String, Object> row, String field) {
        Object value = row.get(field);
        return value == null ? null : value.toString();
    }

    private static int number(Map<String, Object> row, String field) {
        return ((Number) row.get(field)).intValue();
    }

    // --- internal value types -------------------------------------------

    /** A validated submission, shared by create and update. */
    private record Prepared(
            String name,
            String description,
            int categoryId,
            int audienceId,
            String venueName,
            String venueAddress,
            String venueCity,
            String venueLink,
            List<LinkRow> links,
            List<Schedule> schedules,
            List<Integer> tagIds) {
    }
    private record LinkRow(String name, String url) {
    }

    private record Schedule(LocalDate date, LocalDateTime start, LocalDateTime end, String timeRange) {
    }
}
