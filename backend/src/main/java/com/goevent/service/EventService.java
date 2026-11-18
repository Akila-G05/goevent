package com.goevent.service;

import com.goevent.dto.EventDTO;
import com.goevent.dto.EventDetailsDTO;
import com.goevent.dto.EventFilterDTO;
import com.goevent.dto.EventSummaryDTO;
import com.goevent.dto.OwnedEventSummaryDTO;
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
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class EventService {

    private static final Logger logger = AppUtil.getLogger(EventService.class);

    private static final int LISTING_ONLY = 1;
    private static final int MAX_LINKS = 10;
    private static final int MAX_DATES = 30;
    private static final int MAX_TAGS = 20;
    private static final int MAX_LIST_SIZE = 50;

    private static final ZoneId UTC = ZoneId.of("UTC");

    private final EventRepo eventRepo;
    private final FileUploadService fileUploadService;
    private final MapLinkResolver mapLinks;

    public EventService(EventRepo eventRepo, FileUploadService fileUploadService, MapLinkResolver mapLinks) {
        this.eventRepo = eventRepo;
        this.fileUploadService = fileUploadService;
        this.mapLinks = mapLinks;
    }

    //create event
    @Transactional
    public long create(EventDTO input, HttpServletRequest request) {

        int userId = requireOrganizer(request); //vaidate the user. only orgnizer a]can upload events
        Prepared event = prepare(input);

        long venueId = eventRepo.insertVenue(
            event.venueName(),
            event.venueAddress(),
            event.venueCity(),
            event.venueLink()
        );

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
            userId,
            startsAt(event),
            endsAt(event)
        );

        linkIds.forEach(linkId -> eventRepo.linkEvent(eventId, linkId));

        writeSchedule(eventId, event);
        writeTags(eventId, event);

        logger.info(
                "Created event {} by user {} ({} dates, {} links, {} tags).",
                eventId,
                userId,
                event.schedules().size(),
                linkIds.size(),
                event.tagIds().size()
        );

        return eventId;
    }

    //Update Event
    @Transactional
    public long update(long eventId, EventDTO input, HttpServletRequest request) {

        int userId = requireOrganizer(request);

        Map<String, Object> owner = requireOwnedEvent(eventId, userId);
        Prepared event = prepare(input);

        // Update venue
        eventRepo.updateVenue(
                number(owner, "venue_id"),
                event.venueName(),
                event.venueAddress(),
                event.venueCity(),
                event.venueLink()
        );

        // Replace links
        List<Long> oldLinks = eventRepo.eventLinkIds(eventId);

        eventRepo.clearEventLinks(eventId);

        List<Long> newLinks = insertLinks(event.links());

        newLinks.forEach(linkId -> eventRepo.linkEvent(eventId, linkId));

        oldLinks.forEach(eventRepo::deleteLinkIfUnused);

        // Update event details
        eventRepo.updateEvent(
                eventId,
                event.name(),
                event.description(),
                event.categoryId(),
                event.audienceId(),
                startsAt(event),
                endsAt(event),
                newLinks.isEmpty() ? null : newLinks.get(0)
        );

        // Replace schedule
        eventRepo.clearEventDates(eventId);
        writeSchedule(eventId, event);

        // Replace tags
        eventRepo.clearEventTags(eventId);
        writeTags(eventId, event);

        logger.info("Updated event {} by user {}.", eventId, userId);

        return eventId;
    }
    // -------------------------------------------------------------------------
    // ORGANIZER EVENTS
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<OwnedEventSummaryDTO> mine(HttpServletRequest request) {

        int userId = requireOrganizer(request);

        return eventRepo.ownedEventRows(userId)
                .stream()
                .map(EventService::owned)
                .toList();
    }

    @Transactional(readOnly = true)
    public EventDetailsDTO ownerDetail(long eventId, HttpServletRequest request) {

        int userId = requireOrganizer(request);

        requireOwnedEvent(eventId, userId);

        Map<String, Object> row = eventRepo.eventRowById(eventId);

        if (row == null) {
            throw EventException.notFound("Event not found.");
        }

        return toDetails(eventId, row);
    }

    private Map<String, Object> requireOwnedEvent(long eventId, int userId) {

        Map<String, Object> owner = eventRepo.eventOwnerRow(eventId);

        if (owner == null) {
            throw EventException.notFound("Event not found.");
        }

        if (number(owner, "published_by") != userId) {
            throw EventException.forbidden("You can only change your own events.");
        }

        return owner;
    }

    // PREPARE EVENT DATA
    private Prepared prepare(EventDTO input) {

        if (input == null) {
            throw EventException.badRequest("Event details are required.");
        }

        requireListingOnly(input.getEventLevelId());

        String name = required(input.getName(), 100, "Event name");
        String description = optional(input.getDescription(), 5000, "Description");

        int categoryId = resolveCategory(input);
        int audienceId = resolveAudience(input);

        EventDTO.VenueDTO venue = input.getVenue();

        if (venue == null) {
            throw EventException.badRequest("Venue details are required.");
        }

        return new Prepared(
                name,
                description,
                categoryId,
                audienceId,
                required(venue.getName(), 45, "Venue name"),
                optional(venue.getAddress(), 150, "Venue address"),
                required(venue.getCity(), 45, "Venue city"),
                optionalUrl(venue.getLink(), 150, "Map link"),
                validLinks(input.getLinks()),
                validSchedules(input.getDates()),
                resolveTags(input.getTags())
        );
    }

    //saved event related data
    private List<Long> insertLinks(List<LinkRow> links) {
        List<Long> ids = new ArrayList<>();

        for (LinkRow link : links) {
            ids.add(eventRepo.insertLink(link.name(), link.url()));
        }

        return ids;
    }

    private void writeSchedule(long eventId, Prepared event) {
        event.schedules().forEach(schedule ->
            eventRepo.insertEventDate(
                eventId,
                schedule.date(),
                schedule.timeRange()
            )
        );
    }

    private void writeTags(long eventId, Prepared event) {
        event.tagIds().forEach(tagId ->
            eventRepo.attachTag(eventId, tagId)
        );
    }

    private static LocalDateTime startsAt(Prepared event) {
        return event.schedules().getFirst().start();
    }

    private static LocalDateTime endsAt(Prepared event) {
        return event.schedules().getLast().end();
    }

    //event image upload
    @Transactional
    public Map<String, Object> attachImage(long eventId, MultipartFile image, MultipartFile banner, HttpServletRequest request) {
        int userId = requireOrganizer(request);

        Map<String, Object> event = eventRepo.eventImageRow(eventId);

        if (event == null) {
            throw EventException.notFound("Event not found.");
        }

        if (number(event, "published_by") != userId) {
            throw EventException.forbidden(
                    "You can only add images to your own events."
            );
        }

        String imagePath = fileUploadService.uploadFile(
            FileUploadService.SCOPE_EVENT,
            (int) eventId,
            image
        );

        String bannerPath = banner == null || banner.isEmpty()
            ? null
            : fileUploadService.uploadFile(
            FileUploadService.SCOPE_BANNER,
            (int) eventId,
            banner
        );

        try {
            Object existingImageId = event.get("img_id");

            if (existingImageId instanceof Number imageId) {

                eventRepo.updateImage(
                        imageId.longValue(),
                        imagePath,
                        bannerPath
                );

            } else {

                long imageId = eventRepo.insertImage(imagePath, bannerPath);
                eventRepo.setEventImage(eventId, imageId);
            }

        } catch (RuntimeException error) {

            fileUploadService.deleteFile(
                    FileUploadService.SCOPE_EVENT,
                    imagePath
            );

            if (bannerPath != null) {
                fileUploadService.deleteFile(
                        FileUploadService.SCOPE_BANNER,
                        bannerPath
                );
            }

            throw error;
        }

        Map<String, Object> result = new LinkedHashMap<>();

        result.put("status", true);
        result.put("imagePath", imagePath);

        if (bannerPath != null) {
            result.put("bannerPath", bannerPath);
        }

        logger.info("Stored image for event {} by user {}.", eventId, userId);

        return result;
    }
    // -------------------------------------------------------------------------
    // PUBLIC EVENT LISTING
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<EventSummaryDTO> listApproved(int limit, EventSort sort) {

        return listApproved(
                limit,
                sort,
                EventFilterDTO.of(null, null, null, List.of())
        );
    }

    @Transactional(readOnly = true)
    public List<EventSummaryDTO> listApproved(
            int limit,
            EventSort sort,
            EventFilterDTO filter) {

        int size = clampSize(limit);

        List<Map<String, Object>> rows = filter.isEmpty()
                ? eventRepo.approvedEvents(Status.APPROVED.getId(), sort, size)
                : eventRepo.searchApproved(Status.APPROVED.getId(), filter, sort, size);

        return rows.stream()
                .map(EventService::summary)
                .toList();
    }
    // -------------------------------------------------------------------------
    // FILTER OPTIONS
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Map<String, List<String>> filterOptions() {

        return Map.of(
                "categories", eventRepo.categoryNames(),
                "audiences", eventRepo.audienceNames(),
                "tags", eventRepo.tagNames()
        );
    }
    // -------------------------------------------------------------------------
    // RECOMMENDED EVENTS
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<EventSummaryDTO> recommended(
            int limit,
            HttpServletRequest request) {

        int size = clampSize(limit);

        Optional<Integer> universityId = studentUniversityId(request);

        if (universityId.isPresent()) {

            List<Map<String, Object>> events =
                    eventRepo.approvedEventsForUniversity(
                            Status.APPROVED.getId(),
                            universityId.get(),
                            size
                    );

            if (!events.isEmpty()) {
                return events.stream()
                        .map(EventService::summary)
                        .toList();
            }
        }

        return eventRepo.approvedEvents(
                        Status.APPROVED.getId(),
                        EventSort.CREATED,
                        size
                )
                .stream()
                .map(EventService::summary)
                .toList();
    }
    // -------------------------------------------------------------------------
    // RESERVED DATES
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<String> reservedDates() {

        return eventRepo.approvedEventDates(Status.APPROVED.getId())
                .stream()
                .map(LocalDate::toString)
                .toList();
    }
    // -------------------------------------------------------------------------
    // SAVED EVENTS
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<EventSummaryDTO> saved(HttpServletRequest request) {

        int userId = requireSignedIn(request);

        return eventRepo.approvedSavedBy(userId, Status.APPROVED.getId())
                .stream()
                .map(EventService::summary)
                .toList();
    }

    @Transactional
    public void save(long eventId, HttpServletRequest request) {

        int userId = requireSignedIn(request);

        if (eventRepo.approvedEventRow(eventId, Status.APPROVED.getId()) == null) {
            throw EventException.notFound("Event not found.");
        }

        eventRepo.saveEvent(userId, eventId);
    }

    @Transactional
    public void unsave(long eventId, HttpServletRequest request) {

        int userId = requireSignedIn(request);

        eventRepo.unsaveEvent(userId, eventId);
    }
    // -------------------------------------------------------------------------
    // USER SESSION
    // -------------------------------------------------------------------------

    private Integer sessionUserId(HttpServletRequest request) {

        if (request == null) {
            return null;
        }

        HttpSession session = request.getSession(false);

        if (session == null) {
            return null;
        }

        Object userId = session.getAttribute("userId");

        return userId instanceof Integer id ? id : null;
    }

    private int requireSignedIn(HttpServletRequest request) {

        Integer userId = sessionUserId(request);

        if (userId == null || eventRepo.account(userId) == null) {
            throw EventException.unauthorized("Sign in to save events.");
        }

        return userId;
    }

    private Optional<Integer> studentUniversityId(HttpServletRequest request) {

        Integer userId = sessionUserId(request);

        if (userId == null) {
            return Optional.empty();
        }

        Map<String, Object> account = eventRepo.account(userId);

        if (account == null || number(account, "role_id") != Role.STUDENT.getId()) {
            return Optional.empty();
        }

        return eventRepo.studentUniversityId(userId);
    }

    private int requireOrganizer(HttpServletRequest request) {
        Integer userId = sessionUserId(request);

        if (userId == null) {
            throw EventException.unauthorized(
                    "Sign in as an organizer to create an event."
            );
        }

        Map<String, Object> account = eventRepo.account(userId);

        if (account == null) {
            throw EventException.unauthorized(
                    "Your account could not be found. Sign in again."
            );
        }

        if (number(account, "user_status_id") != UserStatus.ACTIVE.getId()) {
            throw EventException.forbidden("This account is not active.");
        }

        if (number(account, "role_id") != Role.ORGANIZER.getId()) {
            throw EventException.forbidden("Only organizers can create events.");
        }

        return userId;
    }
    // -------------------------------------------------------------------------
    // EVENT DETAILS
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public EventDetailsDTO detail(long eventId) {

        Map<String, Object> row =
                eventRepo.approvedEventRow(eventId, Status.APPROVED.getId());

        if (row == null) {
            throw EventException.notFound("Event not found.");
        }

        return toDetails(eventId, row);
    }

    private EventDetailsDTO toDetails(long eventId, Map<String, Object> row) {

        List<EventDetailsDTO.DateSlotDTO> dates =
                eventRepo.eventDateRows(eventId)
                        .stream()
                        .map(date -> new EventDetailsDTO.DateSlotDTO(
                                text(date, "date"),
                                text(date, "time")
                        ))
                        .toList();

        List<EventDetailsDTO.LinkDTO> links =
                eventRepo.eventLinkRows(eventId)
                        .stream()
                        .map(link -> new EventDetailsDTO.LinkDTO(
                                text(link, "link_name"),
                                text(link, "link")
                        ))
                        .toList();

        EventDetailsDTO.VenueDTO venue = new EventDetailsDTO.VenueDTO(
                text(row, "venue_name"),
                text(row, "venue_address"),
                text(row, "venue_city"),
                text(row, "venue_link"),
                mapLinks.coordinatesFor(text(row, "venue_link")).orElse(null)
        );

        return new EventDetailsDTO(
                number(row, "id"),
                text(row, "name"),
                text(row, "description"),
                text(row, "category"),
                text(row, "audience"),
                text(row, "event_level"),
                venue,
                new EventDetailsDTO.OrganizerDTO(
                        text(row, "organizer_name"),
                        text(row, "organizer_since")
                ),
                text(row, "image_path"),
                text(row, "banner_path"),
                dates,
                links,
                eventRepo.eventTagNames(eventId)
        );
    }
    // -------------------------------------------------------------------------
    // DTO MAPPING
    // -------------------------------------------------------------------------

    private static OwnedEventSummaryDTO owned(Map<String, Object> row) {

        return new OwnedEventSummaryDTO(
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
                text(row, "time_range")
        );
    }

    private static EventSummaryDTO summary(Map<String, Object> row) {

        return new EventSummaryDTO(
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
                text(row, "time_range")
        );
    }

    //event validation
    private static void requireListingOnly(Integer eventLevelId) {

        if (eventLevelId == null) {
            throw EventException.badRequest("Choose the event type.");
        }

        if (eventLevelId != LISTING_ONLY) {
            throw EventException.badRequest(
                    "Free and paid ticketing are coming soon. Create a listing-only event for now."
            );
        }
    }

    private int resolveCategory(EventDTO input) {
        Integer categoryId = input.getCategoryId();

        if (categoryId != null) {
            if (!eventRepo.categoryExists(categoryId)) {
                throw EventException.badRequest("Unknown category.");
            }

            return categoryId;
        }

        String name = required(input.getCategoryName(), 45, "Category");

        return eventRepo.categoryId(name)
                .orElseThrow(() ->
                        EventException.badRequest("Unknown category: " + name)
                );
    }

    private int resolveAudience(EventDTO input) {

        Integer audienceId = input.getAudienceId();

        if (audienceId != null) {

            if (!eventRepo.audienceExists(audienceId)) {
                throw EventException.badRequest("Unknown audience.");
            }

            return audienceId;
        }

        String name = required(input.getAudienceName(), 45, "Audience");

        return eventRepo.audienceId(name)
                .orElseThrow(() ->
                        EventException.badRequest("Unknown audience: " + name)
                );
    }
    // -------------------------------------------------------------------------
    // LINK VALIDATION
    // -------------------------------------------------------------------------

    private List<LinkRow> validLinks(List<EventDTO.LinkDTO> links) {

        if (links == null || links.isEmpty()) {
            return List.of();
        }

        if (links.size() > MAX_LINKS) {
            throw EventException.badRequest("Add at most " + MAX_LINKS + " links.");
        }

        List<LinkRow> result = new ArrayList<>();

        for (int i = 0; i < links.size(); i++) {

            EventDTO.LinkDTO link = links.get(i);
            String label = "Link " + (i + 1);

            if (link == null) {
                throw EventException.badRequest(label + " is empty.");
            }

            String name = required(link.getName(), 45, label + " label");
            String url = required(link.getUrl(), 200, label + " URL");

            requireHttpUrl(url, label + " URL");

            result.add(new LinkRow(name, url));
        }

        return result;
    }
    // -------------------------------------------------------------------------
    // SCHEDULE VALIDATION
    // -------------------------------------------------------------------------

    private List<Schedule> validSchedules(List<EventDTO.EventDateDTO> dates) {

        if (dates == null || dates.isEmpty()) {
            throw EventException.badRequest(
                    "Add at least one date to the schedule."
            );
        }

        if (dates.size() > MAX_DATES) {
            throw EventException.badRequest(
                    "Add at most " + MAX_DATES + " dates."
            );
        }

        LocalDate today = LocalDate.now(UTC);
        List<Schedule> schedules = new ArrayList<>();

        for (int i = 0; i < dates.size(); i++) {

            EventDTO.EventDateDTO row = dates.get(i);
            String label = "Schedule row " + (i + 1);

            if (row == null) {
                throw EventException.badRequest(label + " is empty.");
            }

            String rawDate = required(row.getDate(), 10, label + " date");

            LocalDate date;

            try {
                date = LocalDate.parse(rawDate);
            } catch (DateTimeParseException error) {
                throw EventException.badRequest(
                        label + " date must use yyyy-MM-dd."
                );
            }

            if (date.isBefore(today)) {
                throw EventException.badRequest(
                        label + " date cannot be in the past."
                );
            }

            try {

                String timeRange = ScheduleTime.range(
                        row.getStartTime(),
                        row.getEndTime()
                );

                LocalDateTime start = ScheduleTime.at(
                        date,
                        row.getStartTime()
                );

                LocalDateTime end = ScheduleTime.endAt(
                        date,
                        row.getStartTime(),
                        row.getEndTime()
                );

                schedules.add(new Schedule(date, start, end, timeRange));

            } catch (IllegalArgumentException error) {

                throw EventException.badRequest(
                        label + ": " + error.getMessage()
                );
            }
        }

        schedules.sort(Comparator.comparing(Schedule::start));

        return schedules;
    }
    // -------------------------------------------------------------------------
    // TAG VALIDATION
    // -------------------------------------------------------------------------

    private List<Integer> resolveTags(List<String> tags) {

        if (tags == null || tags.isEmpty()) {
            return List.of();
        }

        if (tags.size() > MAX_TAGS) {
            throw EventException.badRequest(
                "Choose at most " + MAX_TAGS + " tags."
            );
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

    //field validation
    private static String required(String value, int max, String field) {

        if (value == null || value.isBlank()) {
            throw EventException.badRequest(field + " is required.");
        }

        String result = value.trim();

        if (result.length() > max) {
            throw EventException.badRequest(
                    field + " must be " + max + " characters or fewer."
            );
        }

        return result;
    }

    private static String optional(String value, int max, String field) {

        if (value == null || value.isBlank()) {
            return null;
        }

        String result = value.trim();

        if (result.length() > max) {
            throw EventException.badRequest(
                    field + " must be " + max + " characters or fewer."
            );
        }

        return result;
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

            boolean validScheme =
                    "http".equalsIgnoreCase(scheme)
                            || "https".equalsIgnoreCase(scheme);

            if (!validScheme || uri.getHost() == null) {
                throw EventException.badRequest(
                        field + " must be a full http(s) link."
                );
            }

        } catch (IllegalArgumentException error) {

            throw EventException.badRequest(
                    field + " must be a full http(s) link."
            );
        }
    }
    // -------------------------------------------------------------------------
    // MAP VALUE HELPERS
    // -------------------------------------------------------------------------

    private static String text(Map<String, Object> row, String field) {
        Object value = row.get(field);

        return value == null ? null : value.toString();
    }

    private static int number(Map<String, Object> row, String field) {

        return ((Number) row.get(field)).intValue();
    }

    private static int clampSize(int limit) {

        return Math.max(1, Math.min(limit, MAX_LIST_SIZE));
    }

    //internal data types
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
            List<Integer> tagIds
    ) {}

    private record LinkRow(String name, String url) {}

    private record Schedule(
            LocalDate date,
            LocalDateTime start,
            LocalDateTime end,
            String timeRange
    ) {}
}
