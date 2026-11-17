package com.goevent.controller;

import com.goevent.dto.EventDTO;
import com.goevent.dto.EventFilter;
import com.goevent.enums.EventSort;
import com.goevent.service.EventService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    public Map<String, Object> list(
            @RequestParam(defaultValue = "24") int limit,
            @RequestParam(defaultValue = "desc") String sort,
            @RequestParam(value = "q", required = false) String query,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "audience", required = false) String audience,
            @RequestParam(value = "tag", required = false) List<String> tags
    ) {
        EventFilter filter = EventFilter.of(query, category, audience, tags);
        return Map.of("status", true, "events", eventService.listApproved(limit, EventSort.parse(sort), filter));
    }

    /** Category, audience and tag options for the events-page filter. */
    @GetMapping("/filters")
    public Map<String, Object> filters() {
        return Map.of("status", true, "options", eventService.filterOptions());
    }

    @GetMapping("/recommended")
    public Map<String, Object> recommended(
            @RequestParam(defaultValue = "6") int limit,
            HttpServletRequest httpRequest
    ) {
        return Map.of("status", true, "events", eventService.recommended(limit, httpRequest));
    }

    /** The signed-in user's saved events. */
    @GetMapping("/saved")
    public Map<String, Object> saved(HttpServletRequest httpRequest) {
        return Map.of("status", true, "events", eventService.saved(httpRequest));
    }

    @PostMapping("/{id}/save")
    public Map<String, Object> save(@PathVariable("id") long id, HttpServletRequest httpRequest) {
        eventService.save(id, httpRequest);
        return Map.of("status", true, "saved", true);
    }

    @DeleteMapping("/{id}/save")
    public Map<String, Object> unsave(@PathVariable("id") long id, HttpServletRequest httpRequest) {
        eventService.unsave(id, httpRequest);
        return Map.of("status", true, "saved", false);
    }
    /** Upcoming dates reserved by approved events, for the organizer calendar. */
    @GetMapping("/calendar")
    public Map<String, Object> calendar() {
        return Map.of("status", true, "dates", eventService.reservedDates());
    }
    /** The signed-in organizer's own events, in any review state. */
    @GetMapping("/mine")
    public Map<String, Object> mine(HttpServletRequest httpRequest) {
        return Map.of("status", true, "events", eventService.mine(httpRequest));
    }

    /** Full detail of one of the organizer's own events, used to prefill the edit form. */
    @GetMapping("/mine/{id}")
    public Map<String, Object> ownerDetail(@PathVariable("id") long id, HttpServletRequest httpRequest) {
        return Map.of("status", true, "event", eventService.ownerDetail(id, httpRequest));
    }

    /** Replaces the listing details of an event the caller owns . */
    @PutMapping("/{id}")
    public Map<String, Object> update(
            @PathVariable("id") long id,
            @RequestBody EventDTO input,
            HttpServletRequest httpRequest
    ) {
        long updated = eventService.update(id, input, httpRequest);
        return Map.of("status", true, "id", updated);
    }
    @GetMapping("/{id}")
    public Map<String, Object> detail(@PathVariable("id") long id) {
        return Map.of("status", true, "event", eventService.detail(id));
    }

    @PostMapping
    public Map<String, Object> create(
            @RequestBody EventDTO input,
            HttpServletRequest httpRequest
    ) {
        long id = eventService.create(input, httpRequest);
        return Map.of("status", true, "id", id);
    }

    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> uploadImage(
            @PathVariable("id") long id,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "banner", required = false) MultipartFile banner,
            HttpServletRequest httpRequest
    ) {
        return eventService.attachImage(id, file, banner, httpRequest);
    }
}
