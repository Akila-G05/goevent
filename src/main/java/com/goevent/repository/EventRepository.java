package com.goevent.repository;

import com.goevent.model.Event;

import java.util.List;

public interface EventRepository extends Repository<Event> {

    List<Event> findByOrganizer(int organizerId);
}
