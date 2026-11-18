package com.goevent.controller;

import com.goevent.dto.EventDTO;
import com.goevent.dto.EventFilterDTO;
import com.goevent.enums.EventSort;
import com.goevent.service.EventService;
import com.goevent.service.EventService2;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/events")
public class EventController2 {
    private final EventService2 eventService;

    public EventController2(EventService2 eventService) {
        this.eventService = eventService;
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody EventDTO input, HttpServletRequest httpRequest) {
        long id = eventService.create(input, httpRequest);
        return Map.of("status", true, "id", id);
    }

}
