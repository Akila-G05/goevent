
package com.goevent.service;

import com.goevent.common.ApiResponse;
import com.goevent.dto.UserDTO;
import com.goevent.enums.AuthType;
import com.goevent.enums.Role;
import com.goevent.repository.ContentRepo;
import com.goevent.repository.UserRepo;
import com.goevent.util.AppUtil;
import com.google.gson.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import org.slf4j.Logger;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.regex.Pattern;

@Service
public class UserService {
    private static final Logger logger = AppUtil.getLogger(UserService.class);
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern MOBILE = Pattern.compile("^\\+?[0-9 ()-]{6,15}$");

    private final UserRepo userRepo;
    private final ContentRepo contentRepo;
    private final FileUploadService fileUploadService;

    public UserService(UserRepo userRepo, ContentRepo contentRepo, FileUploadService fileUploadService) {
        this.userRepo = userRepo;
        this.contentRepo = contentRepo;
        this.fileUploadService = fileUploadService;
    }

    //get curent user profile
    public ResponseEntity<String> getCurentUserData(HttpServletRequest request) {
        Integer userId = currentUserId(request); //validate session and get userid

        if (userId == null) {
            return ApiResponse.unauthorized("Not authenticated");
        }

        JsonObject profile = buildProfileJson(userId);

        return profile != null ? ApiResponse.ok(profile) : ApiResponse.unauthorized("Not authenticated");
    }

    //update current user profile
    @Transactional
    public ResponseEntity<String> updateCurentUserData(String body, HttpServletRequest request) {
        Integer userId = currentUserId(request);

        if (userId == null) {
            return ApiResponse.unauthorized("Not authenticated");
        }

        UserDTO user = userRepo.getUserById(userId);

        if (user == null) {
            return ApiResponse.unauthorized("Not authenticated");
        }

        JsonObject payload;

        try {
            JsonElement parsed = JsonParser.parseString(body);

            if (!parsed.isJsonObject()) {
                return ApiResponse.badRequest("Invalid request body");
            }

            payload = parsed.getAsJsonObject();

        } catch (RuntimeException e) {
            return ApiResponse.badRequest("Invalid request body");
        }

        String firstName = stringField(payload, "firstName", user.getFname());
        String lastName = stringField(payload, "lastName", user.getLname());
        String mobile = stringField(payload, "mobile", user.getMobile());

        String previousImage = user.getProfileImgUrl();
        String profileImage = stringField(
                payload, "profileImgUrl", previousImage
        );

        if (profileImage != null && profileImage.isBlank()) {
            profileImage = null;
        }

        if (firstName == null || firstName.isBlank()) {
            return ApiResponse.badRequest("First name is required");
        }

        if (firstName.length() > 45) {
            return ApiResponse.badRequest(
                    "First name must be 45 characters or fewer"
            );
        }

        if (lastName == null || lastName.isBlank()) {
            return ApiResponse.badRequest("Last name is required");
        }

        if (lastName.length() > 45) {
            return ApiResponse.badRequest(
                    "Last name must be 45 characters or fewer"
            );
        }

        if (mobile != null && !mobile.isBlank()
                && !MOBILE.matcher(mobile).matches()) {
            return ApiResponse.badRequest("Enter a valid mobile number");
        }

        if (profileImage != null && profileImage.length() > 200) {
            return ApiResponse.badRequest("Profile image URL is too long");
        }

        if (profileImage != null && !isAllowedImageUrl(profileImage)) {
            return ApiResponse.badRequest("Invalid profile image");
        }

        //role-specific fields
        Role role = roleOf(user.getRoleId());

        String indexNo = null;
        String uniEmail = null;
        Integer universityId = null;

        Integer organizationId = null;
        String position = null;

        //student details
        if (role == Role.STUDENT && isObjectField(payload, "student")) {

            JsonObject student = payload.getAsJsonObject("student");

            indexNo = stringField(student, "indexNo", null);
            uniEmail = stringField(student, "uniEmail", null);
            universityId = intField(student, "universityId");

            if (indexNo == null || indexNo.isBlank()) {
                return ApiResponse.badRequest("Index number is required");
            }

            if (indexNo.length() > 45) {
                return ApiResponse.badRequest(
                        "Index number must be 45 characters or fewer"
                );
            }

            if (uniEmail == null || !EMAIL.matcher(uniEmail).matches()) {
                return ApiResponse.badRequest(
                        "Enter a valid university email"
                );
            }

            if (uniEmail.length() > 100) {
                return ApiResponse.badRequest(
                        "University email must be 100 characters or fewer"
                );
            }

            if (universityId == null
                    || !userRepo.universityExists(universityId)) {
                return ApiResponse.badRequest("Select a valid university");
            }
        }

        //organizer details
        if (role == Role.ORGANIZER
                && isObjectField(payload, "organization")) {

            JsonObject organization =
                    payload.getAsJsonObject("organization");

            organizationId = intField(organization, "organizationId");
            position = stringField(organization, "position", null);

            if (organizationId == null
                    || !userRepo.organizationExists(organizationId)) {
                return ApiResponse.badRequest("Select a valid organization");
            }

            Map<String, Object> approved =
                    userRepo.getOrganizerDetail(userId);

            if (approved == null
                    || ((Number) approved.get("organization_id"))
                    .intValue() != organizationId) {
                return ApiResponse.badRequest(
                        "Organization changes are not available from your profile"
                );
            }

            if (position == null || position.isBlank()) {
                return ApiResponse.badRequest("Position is required");
            }

            if (position.length() > 45) {
                return ApiResponse.badRequest(
                        "Position must be 45 characters or fewer"
                );
            }
        }

        //save profile
        userRepo.updateProfile(
                userId, firstName, lastName, mobile, profileImage
        );

        if (indexNo != null) {
            userRepo.upsertStudentDetail(
                    userId, indexNo, uniEmail, universityId
            );
        }

        if (organizationId != null) {
            userRepo.upsertOrganizerDetail(
                    userId, organizationId, position
            );
        }

        // Delete old profile image
        if (previousImage != null && !previousImage.equals(profileImage)) {
            fileUploadService.deleteFile(
                    FileUploadService.SCOPE_PROFILE, previousImage
            );
        }

        refreshSessionProfile(request, userId);

        JsonObject profile = buildProfileJson(userId);

        return profile != null
                ? ApiResponse.ok(profile)
                : ApiResponse.unauthorized("Not authenticated");
    }

    //upload profile image
    public ResponseEntity<String> uploadProfileImage(
            MultipartFile file, HttpServletRequest request) {

        Integer userId = currentUserId(request);

        if (userId == null) {
            return ApiResponse.unauthorized("Not authenticated");
        }

        String imageUrl = fileUploadService.uploadFile(
                FileUploadService.SCOPE_PROFILE, userId, file
        );

        JsonObject response = new JsonObject();

        response.addProperty("status", true);
        response.addProperty("profileImgUrl", imageUrl);

        return ApiResponse.ok(response);
    }

    // Build complete profile response
    private JsonObject buildProfileJson(int userId) {

        UserDTO user = userRepo.getUserById(userId);

        if (user == null) {
            return null;
        }

        JsonObject response = new JsonObject();

        response.addProperty("status", true);
        response.addProperty("firstName", user.getFname());
        response.addProperty("lastName", user.getLname());
        response.addProperty("name", buildDisplayName(user));
        response.addProperty("email", user.getEmail());
        response.addProperty("mobile", user.getMobile());
        response.addProperty("role", roleName(user.getRoleId()));
        response.addProperty("authType", authTypeName(user.getAuthTypeId()));
        response.addProperty("profileImgUrl", user.getProfileImgUrl());

        response.addProperty("registeredDate", user.getRegisteredDate() != null ? user.getRegisteredDate().toLocalDateTime().toLocalDate().toString() : null);

        //student details
        Map<String, Object> student = userRepo.getStudentDetail(userId);

        if (student != null) {
            JsonObject studentJson = new JsonObject();

            studentJson.addProperty("indexNo", stringValue(student.get("index_no")));
            studentJson.addProperty("uniEmail", stringValue(student.get("uni_email")));
            studentJson.addProperty("universityId", intValue(student.get("university_id")));
            studentJson.addProperty("universityName", stringValue(student.get("university_name")));

            response.add("student", studentJson);
        } else {
            response.add("student", JsonNull.INSTANCE);
        }

        //organization details
        Map<String, Object> organizer =
                userRepo.getOrganizerDetail(userId);

        if (organizer != null) {
            JsonObject organizationJson = new JsonObject();

            organizationJson.addProperty("organizationId", intValue(organizer.get("organization_id")));
            organizationJson.addProperty("organizationName", stringValue(organizer.get("organization_name")));
            organizationJson.addProperty("position", stringValue(organizer.get("position")));

            response.add("organization", organizationJson);
        } else {
            response.add("organization", JsonNull.INSTANCE);
        }

        //dropdown options
        JsonObject options = new JsonObject();

        options.add("universities", AppUtil.gson.toJsonTree(contentRepo.getUniversities()));
        options.add("organizations", AppUtil.gson.toJsonTree(contentRepo.getOrganizations()));
        response.add("options", options);

        return response;
    }

    // get authenticated user ID
    private Integer currentUserId(HttpServletRequest request) {

        HttpSession session = request.getSession(false);

        if (session == null) {
            return null;
        }

        Object value = session.getAttribute("userId");

        if (!(value instanceof Integer userId)) {
            return null;
        }

        UserDTO user = userRepo.getUserById(userId);

        if (user == null || user.getUserStatusId() != 1) {
            session.invalidate();
            return null;
        }

        return userId;
    }

    // Refresh session data
    private void refreshSessionProfile(
            HttpServletRequest request, int userId) {

        HttpSession session = request.getSession(false);

        if (session == null) {
            return;
        }

        UserDTO user = userRepo.getUserById(userId);

        if (user == null) {
            return;
        }

        session.setAttribute("name", buildDisplayName(user));
        session.setAttribute("email", user.getEmail());
    }

    // Build display name
    private String buildDisplayName(UserDTO user) {

        String name = (
                (user.getFname() == null ? "" : user.getFname().trim())
                        + " "
                        + (user.getLname() == null ? "" : user.getLname().trim())
        ).trim();

        return name.isEmpty() ? user.getEmail() : name;
    }

    // Get role name
    private String roleName(int roleId) {
        Role role = roleOf(roleId);
        return role != null ? role.name() : null;
    }

    private Role roleOf(int roleId) {
        try {
            return Role.fromId(roleId);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    // Get authentication type
    private String authTypeName(int authTypeId) {
        try {
            return AuthType.fromId(authTypeId).name();
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    // Validate profile image URL
    private boolean isAllowedImageUrl(String url) {
        return fileUploadService.isOwnUrl(
                FileUploadService.SCOPE_PROFILE, url
        ) || url.startsWith("http://") || url.startsWith("https://");
    }

    private boolean isObjectField(JsonObject object, String key) {
        return object.has(key)
                && !object.get(key).isJsonNull()
                && object.get(key).isJsonObject();
    }

    private String stringField(JsonObject object, String key, String fallback) {
        if (object == null || !object.has(key) || object.get(key).isJsonNull()) {
            return fallback;
        }

        JsonElement element = object.get(key);

        return element.isJsonPrimitive() ? element.getAsString().trim() : fallback;
    }

    private Integer intField(JsonObject object, String key) {
        if (object == null || !object.has(key) || object.get(key).isJsonNull()) {
            return null;
        }

        try {
            return object.get(key).getAsInt();
        } catch (RuntimeException e) {
            return null;
        }
    }

    private String stringValue(Object value) {
        return value != null ? value.toString() : null;
    }

    private int intValue(Object value) {

        if (value instanceof Number number) {
            return number.intValue();
        }

        try {
            return value != null
                    ? Integer.parseInt(value.toString())
                    : 0;
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
