package com.goevent.model;

import com.goevent.util.Validation;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

/** A confirmed purchase of one ticket type for one event. */
public class Booking {

    private final int id;
    private final int viewerId;
    private final int eventId;
    private final String ticketName;
    private final int quantity;
    private final BigDecimal total;
    private final LocalDateTime bookedAt;

    public Booking(int id, int viewerId, int eventId, String ticketName, int quantity,
                   BigDecimal total, LocalDateTime bookedAt) {
        this.id = id;
        this.viewerId = viewerId;
        this.eventId = eventId;
        this.ticketName = Validation.requireText(ticketName, "Ticket name");
        this.quantity = Validation.requirePositive(quantity, "Quantity");
        this.total = Objects.requireNonNull(total, "Total is required.");
        this.bookedAt = Objects.requireNonNull(bookedAt, "Booking time is required.");
    }

    public int getId() {
        return id;
    }

    public int getViewerId() {
        return viewerId;
    }

    public int getEventId() {
        return eventId;
    }

    public String getTicketName() {
        return ticketName;
    }

    public int getQuantity() {
        return quantity;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public LocalDateTime getBookedAt() {
        return bookedAt;
    }
}
