package com.goevent.controller;

import com.goevent.service.EventService;

public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService){
        this.eventService = eventService;
    }

}
