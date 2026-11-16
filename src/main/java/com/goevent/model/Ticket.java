package com.goevent.model;

import com.goevent.exception.InsufficientStockException;
import com.goevent.exception.ValidationException;
import com.goevent.util.Validation;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * A ticket type with fixed capacity. The stock invariant (0 <= sold <= capacity)
 * is enforced here and cannot be broken from outside the class.
 */
public abstract class Ticket {

    private final String name;
    private final BigDecimal unitPrice;
    private final int capacity;
    private int sold;

    protected Ticket(String name, BigDecimal unitPrice, int capacity, int sold) {
        this.name = Validation.requireText(name, "Ticket name");
        if (unitPrice == null || unitPrice.signum() < 0) {
            throw new ValidationException("Ticket price cannot be negative.");
        }
        if (capacity < 1) {
            throw new ValidationException("Ticket capacity must be at least 1.");
        }
        if (sold < 0 || sold > capacity) {
            throw new ValidationException("Sold count is out of range for '" + name + "'.");
        }
        this.unitPrice = unitPrice.setScale(2, RoundingMode.HALF_UP);
        this.capacity = capacity;
        this.sold = sold;
    }

    /** Factory that builds the right subclass for a stored or newly entered ticket type. */
    public static Ticket create(TicketType type, String name, BigDecimal unitPrice, int capacity, int sold) {
        return switch (type) {
            case STANDARD -> new StandardTicket(name, unitPrice, capacity, sold);
            case VIP -> new VipTicket(name, unitPrice, capacity, sold);
        };
    }

    public abstract TicketType type();

    /** Benefits shown to viewers. Each ticket type describes its own perks. */
    public abstract String perks();

    public BigDecimal priceFor(int quantity) {
        return unitPrice.multiply(BigDecimal.valueOf(quantity));
    }

    public int remaining() {
        return capacity - sold;
    }

    /** Package-private so only Event can reserve stock, and only after its own checks. */
    void reserve(int quantity) {
        if (quantity > remaining()) {
            throw new InsufficientStockException(name, quantity, remaining());
        }
        sold += quantity;
    }

    public String getName() {
        return name;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public int getCapacity() {
        return capacity;
    }

    public int getSold() {
        return sold;
    }
}
