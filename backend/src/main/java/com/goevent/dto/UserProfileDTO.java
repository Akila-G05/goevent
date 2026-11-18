package com.goevent.dto;

import java.util.List;
import java.util.Map;

public class UserProfileDTO {
    private Boolean status;
    private String firstName;
    private String lastName;
    private String name;
    private String email;
    private String mobile;
    private String role;
    private String authType;
    private String profileImgUrl;
    private String registeredDate;
    private StudentDTO student;
    private OrganizationDTO organization;
    private OptionsDTO options;

    public UserProfileDTO() {
    }

    public UserProfileDTO(Boolean status, String firstName, String lastName, String name, String email,
                          String mobile, String role, String authType, String profileImgUrl,
                          String registeredDate, StudentDTO student, OrganizationDTO organization,
                          OptionsDTO options) {
        this.status = status;
        this.firstName = firstName;
        this.lastName = lastName;
        this.name = name;
        this.email = email;
        this.mobile = mobile;
        this.role = role;
        this.authType = authType;
        this.profileImgUrl = profileImgUrl;
        this.registeredDate = registeredDate;
        this.student = student;
        this.organization = organization;
        this.options = options;
    }

    public static UserProfileDTO imageUploaded(String profileImgUrl) {
        UserProfileDTO profile = new UserProfileDTO();
        profile.setStatus(true);
        profile.setProfileImgUrl(profileImgUrl);
        return profile;
    }

    public Boolean getStatus() {
        return status;
    }

    public void setStatus(Boolean status) {
        this.status = status;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getAuthType() {
        return authType;
    }

    public void setAuthType(String authType) {
        this.authType = authType;
    }

    public String getProfileImgUrl() {
        return profileImgUrl;
    }

    public void setProfileImgUrl(String profileImgUrl) {
        this.profileImgUrl = profileImgUrl;
    }

    public String getRegisteredDate() {
        return registeredDate;
    }

    public void setRegisteredDate(String registeredDate) {
        this.registeredDate = registeredDate;
    }

    public StudentDTO getStudent() {
        return student;
    }

    public void setStudent(StudentDTO student) {
        this.student = student;
    }

    public OrganizationDTO getOrganization() {
        return organization;
    }

    public void setOrganization(OrganizationDTO organization) {
        this.organization = organization;
    }

    public OptionsDTO getOptions() {
        return options;
    }

    public void setOptions(OptionsDTO options) {
        this.options = options;
    }

    public static class StudentDTO {
        private String indexNo;
        private String uniEmail;
        private Integer universityId;
        private String universityName;

        public StudentDTO() {
        }

        public StudentDTO(String indexNo, String uniEmail, Integer universityId, String universityName) {
            this.indexNo = indexNo;
            this.uniEmail = uniEmail;
            this.universityId = universityId;
            this.universityName = universityName;
        }

        public String getIndexNo() {
            return indexNo;
        }

        public void setIndexNo(String indexNo) {
            this.indexNo = indexNo;
        }

        public String getUniEmail() {
            return uniEmail;
        }

        public void setUniEmail(String uniEmail) {
            this.uniEmail = uniEmail;
        }

        public Integer getUniversityId() {
            return universityId;
        }

        public void setUniversityId(Integer universityId) {
            this.universityId = universityId;
        }

        public String getUniversityName() {
            return universityName;
        }

        public void setUniversityName(String universityName) {
            this.universityName = universityName;
        }
    }

    public static class OrganizationDTO {
        private Integer organizationId;
        private String organizationName;
        private String position;

        public OrganizationDTO() {
        }

        public OrganizationDTO(Integer organizationId, String organizationName, String position) {
            this.organizationId = organizationId;
            this.organizationName = organizationName;
            this.position = position;
        }

        public Integer getOrganizationId() {
            return organizationId;
        }

        public void setOrganizationId(Integer organizationId) {
            this.organizationId = organizationId;
        }

        public String getOrganizationName() {
            return organizationName;
        }

        public void setOrganizationName(String organizationName) {
            this.organizationName = organizationName;
        }

        public String getPosition() {
            return position;
        }

        public void setPosition(String position) {
            this.position = position;
        }
    }

    public static class OptionsDTO {
        private List<Map<String, Object>> universities;
        private List<Map<String, Object>> organizations;

        public OptionsDTO() {
        }

        public OptionsDTO(List<Map<String, Object>> universities, List<Map<String, Object>> organizations) {
            this.universities = universities;
            this.organizations = organizations;
        }

        public List<Map<String, Object>> getUniversities() {
            return universities;
        }

        public void setUniversities(List<Map<String, Object>> universities) {
            this.universities = universities;
        }

        public List<Map<String, Object>> getOrganizations() {
            return organizations;
        }

        public void setOrganizations(List<Map<String, Object>> organizations) {
            this.organizations = organizations;
        }
    }
}
