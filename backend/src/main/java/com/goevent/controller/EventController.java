package com.goevent.controller;

import com.goevent.dto.EventDTO;
import com.goevent.enums.EventSort;
import com.goevent.service.EventService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Event endpoints. Creating an event writes the listing only; free and paid
 * ticketing are rejected until their flows exist. The image is uploaded as a
 * separate multipart call once the event id exists.
 */
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
            @RequestParam(defaultValue = "asc") String sort
    ) {
        return Map.of("status", true, "events", eventService.listApproved(limit, EventSort.parse(sort)));
    }

    @GetMapping("/recommended")
    public Map<String, Object> recommended(
            @RequestParam(defaultValue = "6") int limit,
            HttpServletRequest httpRequest
    ) {
        return Map.of("status", true, "events", eventService.recommended(limit, httpRequest));
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
