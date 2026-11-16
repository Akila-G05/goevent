package com.goevent.service;

import com.goevent.exception.EventNotFoundException;
import com.goevent.exception.ValidationException;
import com.goevent.model.Event;
import com.goevent.model.Organizer;
import com.goevent.model.Ticket;
import com.goevent.repository.EventRepository;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

public class EventService {

    private final EventRepository events;

    public EventService(EventRepository events) {
        this.events = events;
    }

    public Event createEvent(Organizer organizer, String title, String venue,
                             LocalDateTime startsAt, List<Ticket> tickets) {
        Objects.requireNonNull(organizer, "Organizer is required.");
        if (startsAt == null || startsAt.isBefore(LocalDateTime.now())) {
            throw new ValidationException("Event start time must be in the future.");
        }
        Event event = new Event(events.nextId(), organizer.getId(), title, venue, startsAt, tickets);
        events.save(event);
        return event;
    }

    public List<Event> eventsOf(Organizer organizer) {
        return events.findByOrganizer(organizer.getId()).stream()
                .sorted(Comparator.comparing(Event::getStartsAt))
                .toList();
    }

    /** Upcoming events whose title or venue contains the keyword. An empty keyword matches all. */
    public List<Event> browse(String keyword) {
        String search = keyword == null ? "" : keyword.trim().toLowerCase();
        LocalDateTime now = LocalDateTime.now();
        return events.findAll().stream()
                .filter(event -> !event.getStartsAt().isBefore(now))
                .filter(event -> event.getTitle().toLowerCase().contains(search)
                        || event.getVenue().toLowerCase().contains(search))
                .sorted(Comparator.comparing(Event::getStartsAt))
                .toList();
    }

    public Event getEvent(int eventId) {
        return events.findById(eventId).orElseThrow(() -> new EventNotFoundException(eventId));
    }

    public void saveEvent(Event event) {
        events.save(event);
    }
}
