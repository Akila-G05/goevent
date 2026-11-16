package com.goevent.service;

import com.goevent.model.Booking;
import com.goevent.model.Event;
import com.goevent.model.Ticket;
import com.goevent.model.Viewer;
import com.goevent.repository.BookingRepository;

import java.time.LocalDateTime;
import java.util.List;

public class BookingService {

    private final BookingRepository bookings;
    private final EventService eventService;

    public BookingService(BookingRepository bookings, EventService eventService) {
        this.bookings = bookings;
        this.eventService = eventService;
    }

    /**
     * Reserves stock, saves the event, then records the booking. The method is synchronized
     * so two viewers in this process cannot both take the last ticket.
     */
    public synchronized Booking book(Viewer viewer, int eventId, String ticketName, int quantity) {
        Event event = eventService.getEvent(eventId);
        Ticket ticket = event.reserve(ticketName, quantity);
        eventService.saveEvent(event);

        Booking booking = new Booking(bookings.nextId(), viewer.getId(), eventId, ticket.getName(),
                quantity, ticket.priceFor(quantity), LocalDateTime.now());
        bookings.save(booking);
        return booking;
    }

    public List<Booking> bookingsOf(Viewer viewer) {
        return bookings.findByViewer(viewer.getId());
    }
}
