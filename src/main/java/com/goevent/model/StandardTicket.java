package com.goevent.model;

import java.math.BigDecimal;

public class StandardTicket extends Ticket {

    StandardTicket(String name, BigDecimal unitPrice, int capacity, int sold) {
        super(name, unitPrice, capacity, sold);
    }

    @Override
    public TicketType type() {
        return TicketType.STANDARD;
    }

    @Override
    public String perks() {
        return "General admission";
    }
}
