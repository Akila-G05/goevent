package com.goevent.service;

import com.goevent.repository.EventRepo;
import com.goevent.util.AppUtil;
import org.slf4j.Logger;

public class EventService {

    private final EventRepo eventRepo;
    private static final Logger logger = AppUtil.getLogger(ContentService.class);

    public EventService(EventRepo eventRepo){
        this.eventRepo = eventRepo;
    }

}
