package com.goevent.model;

import com.goevent.exception.BookingException;
import com.goevent.exception.ValidationException;
import com.goevent.util.Validation;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/** An event owned by one organizer, with one or more ticket types. */
public class Event {

    private final int id;
    private final int organizerId;
    private final String title;
    private final String venue;
    private final LocalDateTime startsAt;
    private final List<Ticket> tickets;

    public Event(int id, int organizerId, String title, String venue, LocalDateTime startsAt, List<Ticket> tickets) {
        this.id = id;
        this.organizerId = organizerId;
        this.title = Validation.requireText(title, "Title");
        this.venue = Validation.requireText(venue, "Venue");
        this.startsAt = Objects.requireNonNull(startsAt, "Start time is required.");
        this.tickets = validateTickets(tickets);
    }

    private static List<Ticket> validateTickets(List<Ticket> tickets) {
        if (tickets == null || tickets.isEmpty()) {
            throw new ValidationException("An event needs at least one ticket type.");
        }
        Set<String> names = new HashSet<>();
        for (Ticket ticket : tickets) {
            if (!names.add(ticket.getName().toLowerCase())) {
                throw new ValidationException("Ticket names must be unique: " + ticket.getName());
            }
        }
        return List.copyOf(tickets);
    }

    /** Reserves tickets of one type. Stock is checked before anything is changed. */
    public Ticket reserve(String ticketName, int quantity) {
        Validation.requirePositive(quantity, "Quantity");
        if (startsAt.isBefore(LocalDateTime.now())) {
            throw new BookingException("This event has already started.");
        }
        Ticket ticket = findTicket(ticketName);
        ticket.reserve(quantity);
        return ticket;
    }

    public Ticket findTicket(String ticketName) {
        return tickets.stream()
                .filter(ticket -> ticket.getName().equalsIgnoreCase(ticketName))
                .findFirst()
                .orElseThrow(() -> new BookingException("No ticket type named '" + ticketName + "'."));
    }

    public int getId() {
        return id;
    }

    public int getOrganizerId() {
        return organizerId;
    }

    public String getTitle() {
        return title;
    }

    public String getVenue() {
        return venue;
    }

    public LocalDateTime getStartsAt() {
        return startsAt;
    }

    public List<Ticket> getTickets() {
        return tickets;
    }
}
