package com.goevent.dto;

import java.time.Instant;

/** Explicit mutation fields; clients cannot submit arbitrary SQL columns or roles through maps. */
public final class AdminRequests {
    private AdminRequests() {}
    public record Account(String firstName, String lastName, String email, String password,
                          Integer roleId, Integer statusId, String reason,
                          Integer organizationId, String position) {}
    public record Reason(String reason) {}
    public record Decision(boolean approve, String reason) {}
    public record Coordinator(int organizationId, String position, String message) {}
    public record EventEdit(String name, String description, Instant startsAt, Instant endsAt,
                            int revision, String reason) {}
    public record EventDecision(boolean approve, int revision, String reason) {}
    public record Contact(String email, String subject, String message) {}
    public record Reply(String message) {}
}
