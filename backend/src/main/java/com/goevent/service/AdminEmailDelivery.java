package com.goevent.service;

/** Boundary for testing administrative notifications without sending real mail. */
public interface AdminEmailDelivery {
    String send(String recipient,String subject,String body);
}
