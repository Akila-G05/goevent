package com.goevent.dto;

import java.util.List;
import java.util.Map;

public record UserProfileDTO(
        Boolean status,
        String firstName,
        String lastName,
        String name,
        String email,
        String mobile,
        String role,
        String authType,
        String profileImgUrl,
        String registeredDate,
        Student student,
        Organization organization,
        Options options
) {

    /** Response for a successful picture upload. */
    public static UserProfileDTO imageUploaded(String profileImgUrl) {
        return new UserProfileDTO(true, null, null, null, null, null, null, null,
                profileImgUrl, null, null, null, null);
    }

    public record Student(
        String indexNo,
        String uniEmail,
        Integer universityId,
        String universityName
    ) {}

    public record Organization(
        Integer organizationId,
        String organizationName,
        String position
    ) {}

    public record Options(
        List<Map<String, Object>> universities,
        List<Map<String, Object>> organizations
    ) {}
}
