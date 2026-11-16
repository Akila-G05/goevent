package com.goevent.model;

import java.math.BigDecimal;

public class VipTicket extends Ticket {

    VipTicket(String name, BigDecimal unitPrice, int capacity, int sold) {
        super(name, unitPrice, capacity, sold);
    }

    @Override
    public TicketType type() {
        return TicketType.VIP;
    }

    @Override
    public String perks() {
        return "Priority entry and lounge access";
    }
}
