package com.goevent.dto;

import java.math.BigDecimal;
import java.util.List;

/** Inputs contain configuration only, never trusted ownership or publication state. */
public final class CoordinatorRequests {
    private CoordinatorRequests() {}
    public record Application(Integer organizationId, String proposedName, Integer proposedTypeId,
        String position, String contactEmail, String contactPhone, String explanation, Long proofId) {}
    public record Review(boolean approve, String reason, Integer organizationId, boolean createOrganization) {}
    public record Package(String name, String benefits, int quantity, BigDecimal price,
        String saleStartsAt, String saleEndsAt, List<Integer> universityIds) {}
    public record Event(String name, String description, int categoryId, int audienceId, int eventLevelId,
        String venueName, String venueAddress, String venueCity, String timezone, String startsAt, String endsAt,
        String imagePath, String bannerPath, String videoUrl, Long approvalDocumentId, String confirmationMessage,
        String currency, List<Package> packages, List<Integer> universityIds, int minimumAge,
        int bookingLimit, boolean qrIntended) {}
    public record Save(int revision, Event content) {}
    public record Version(int revision) {}
    public record Removal(int revision, String reason) {}
    public record Campaign(String subject, String message, String scheduledLocal, boolean confirm) {}
    public record Assignment(int organizationId, String reason) {}
}
