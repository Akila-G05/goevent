
package com.goevent.service;

import com.goevent.dto.*;
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
import java.util.*;

@Service
public class EventService2 {

    private static final Logger logger = AppUtil.getLogger(EventService2.class);

    private static final int LISTING_ONLY = 1;
    private static final int MAX_LINKS = 10;
    private static final int MAX_DATES = 30;
    private static final int MAX_TAGS = 20;
    private static final int MAX_LIST_SIZE = 50;

    private static final ZoneId UTC = ZoneId.of("UTC");

    private final EventRepo eventRepo;
    private final FileUploadService fileUploadService;
    private final MapLinkResolver mapLinks;

    public EventService2(EventRepo eventRepo, FileUploadService fileUploadService, MapLinkResolver mapLinks) {
        this.eventRepo = eventRepo;
        this.fileUploadService = fileUploadService;
        this.mapLinks = mapLinks;
    }

    public long create(EventDTO input, HttpServletRequest request) {
        int userId = requireOrganizer(request);
        EventService.Prepared event = prepare(input);

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

    private int requireOrganizer(HttpServletRequest request) {
        Integer userId = sessionUserId(request); //get userid from session

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
}
