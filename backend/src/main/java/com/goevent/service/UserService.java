package com.goevent.service;

import com.goevent.config.FileStorageConfig;
import com.goevent.dto.UserDTO;
import com.goevent.enums.AuthType;
import com.goevent.enums.Role;
import com.goevent.repository.ContentRepo;
import com.goevent.repository.UserRepo;
import com.goevent.util.AppUtil;
import com.google.gson.JsonElement;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.regex.Pattern;

@Service
public class UserService {

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern MOBILE = Pattern.compile("^\\+?[0-9 ()-]{6,15}$");

    private final UserRepo userRepo;
    private final ContentRepo contentRepo;
    private final ImageUploadService imageUploadService;

    public UserService(
            UserRepo userRepo,
            ContentRepo contentRepo,
            ImageUploadService imageUploadService
    ) {
        this.userRepo = userRepo;
        this.contentRepo = contentRepo;
        this.imageUploadService = imageUploadService;
    }

    /**
     * Returns everything the profile page and the edit dialog need in a single
     * response: base profile, auth type, role-specific details and the
     * university/organization dropdown options.
     */
    public ResponseEntity<String> getCurrentUserData(HttpServletRequest httpRequest) {

        Integer userId = currentUserId(httpRequest);

        if (userId == null) {
            return unauthorized("Not authenticated");
        }

        JsonObject profile = buildProfileJson(userId);

        if (profile == null) {
            // Session points at a user that no longer exists.
            return unauthorized("Not authenticated");
        }

        return json(HttpStatus.OK, profile);
    }

    /**
     * Updates the editable parts of the profile. Role, auth type and email are
     * never taken from the client; they are read from the database.
     */
    @Transactional
    public ResponseEntity<String> updateCurrentUserData(String body, HttpServletRequest httpRequest) {

        Integer userId = currentUserId(httpRequest);

        if (userId == null) {
            return unauthorized("Not authenticated");
        }

        UserDTO user = userRepo.getUserById(userId);

        if (user == null) {
            return unauthorized("Not authenticated");
        }

        JsonObject payload;

        try {
            JsonElement parsed = JsonParser.parseString(body);

            if (!parsed.isJsonObject()) {
                return badRequest("Invalid request body");
            }

            payload = parsed.getAsJsonObject();
        } catch (RuntimeException e) {
            return badRequest("Invalid request body");
        }

        String firstName = stringField(payload, "firstName", user.getFname());
        String lastName = stringField(payload, "lastName", user.getLname());
        String mobile = stringField(payload, "mobile", user.getMobile());
        String previousProfileImgUrl = user.getProfileImgUrl();
        String profileImgUrl = stringField(payload, "profileImgUrl", previousProfileImgUrl);

        // A blank value removes the picture; an absent value keeps the current one.
        if (profileImgUrl != null && profileImgUrl.isBlank()) {
            profileImgUrl = null;
        }

        if (firstName == null || firstName.isBlank()) {
            return badRequest("First name is required");
        }
        if (firstName.length() > 45) {
            return badRequest("First name must be 45 characters or fewer");
        }
        if (lastName == null || lastName.isBlank()) {
            return badRequest("Last name is required");
        }
        if (lastName.length() > 45) {
            return badRequest("Last name must be 45 characters or fewer");
        }
        if (mobile != null && !mobile.isBlank() && !MOBILE.matcher(mobile).matches()) {
            return badRequest("Enter a valid mobile number");
        }
        if (profileImgUrl != null && profileImgUrl.length() > 200) {
            return badRequest("Profile image URL is too long");
        }
        if (profileImgUrl != null && !isAllowedImageUrl(profileImgUrl)) {
            return badRequest("Invalid profile image");
        }

        Role role = roleOf(user.getRoleId());

        String indexNo = null;
        String uniEmail = null;
        Integer universityId = null;
        Integer organizationId = null;
        String position = null;

        if (role == Role.STUDENT && isObjectField(payload, "student")) {
            JsonObject student = payload.getAsJsonObject("student");

            indexNo = stringField(student, "indexNo", null);
            uniEmail = stringField(student, "uniEmail", null);
            universityId = intField(student, "universityId");

            if (indexNo == null || indexNo.isBlank()) {
                return badRequest("Index number is required");
            }
            if (indexNo.length() > 45) {
                return badRequest("Index number must be 45 characters or fewer");
            }
            if (uniEmail == null || !EMAIL.matcher(uniEmail).matches()) {
                return badRequest("Enter a valid university email");
            }
            if (uniEmail.length() > 100) {
                return badRequest("University email must be 100 characters or fewer");
            }
            if (universityId == null || !userRepo.universityExists(universityId)) {
                return badRequest("Select a valid university");
            }
        }

        if (role == Role.ORGANIZER && isObjectField(payload, "organization")) {
            JsonObject organization = payload.getAsJsonObject("organization");

            organizationId = intField(organization, "organizationId");
            position = stringField(organization, "position", null);

            if (organizationId == null || !userRepo.organizationExists(organizationId)) {
                return badRequest("Select a valid organization");
            }
            if (position == null || position.isBlank()) {
                return badRequest("Position is required");
            }
            if (position.length() > 45) {
                return badRequest("Position must be 45 characters or fewer");
            }
        }

        userRepo.updateProfile(userId, firstName, lastName, mobile, profileImgUrl);

        if (indexNo != null) {
            userRepo.upsertStudentDetail(userId, indexNo, uniEmail, universityId);
        }

        if (organizationId != null) {
            userRepo.upsertOrganizerDetail(userId, organizationId, position);
        }

        // Only after the database points at the new file do we remove the old
        // one, so a failed save never leaves the profile without an image.
        if (previousProfileImgUrl != null && !previousProfileImgUrl.equals(profileImgUrl)) {
            imageUploadService.deleteByPath(FileStorageConfig.SCOPE_PROFILE, previousProfileImgUrl);
        }

        refreshSessionProfile(httpRequest, userId);

        JsonObject profile = buildProfileJson(userId);

        if (profile == null) {
            return unauthorized("Not authenticated");
        }

        return json(HttpStatus.OK, profile);
    }

    /**
     * Stores a profile picture through the shared image service and returns the
     * public URL that the browser (and MySQL) should use.
     */
    public ResponseEntity<String> uploadProfileImage(MultipartFile file, HttpServletRequest httpRequest) {

        Integer userId = currentUserId(httpRequest);

        if (userId == null) {
            return unauthorized("Not authenticated");
        }

        String profileImgUrl = imageUploadService.uploadProfilePicture(file);

        JsonObject response = new JsonObject();

        response.addProperty("status", true);
        response.addProperty("profileImgUrl", profileImgUrl);

        return json(HttpStatus.OK, response);
    }

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
        response.addProperty(
                "registeredDate",
                user.getRegisteredDate() != null
                        ? user.getRegisteredDate().toLocalDateTime().toLocalDate().toString()
                        : null
        );

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

        Map<String, Object> organizer = userRepo.getOrganizerDetail(userId);

        if (organizer != null) {
            JsonObject organizationJson = new JsonObject();

            organizationJson.addProperty("organizationId", intValue(organizer.get("organization_id")));
            organizationJson.addProperty("organizationName", stringValue(organizer.get("organization_name")));
            organizationJson.addProperty("position", stringValue(organizer.get("position")));

            response.add("organization", organizationJson);
        } else {
            response.add("organization", JsonNull.INSTANCE);
        }

        JsonObject options = new JsonObject();

        options.add("universities", AppUtil.gson.toJsonTree(contentRepo.getUniversities()));
        options.add("organizations", AppUtil.gson.toJsonTree(contentRepo.getOrganizations()));

        response.add("options", options);

        return response;
    }

    private Integer currentUserId(HttpServletRequest httpRequest) {

        HttpSession session = httpRequest.getSession(false);
        Object sessionUserId = session != null ? session.getAttribute("userId") : null;

        return sessionUserId instanceof Integer ? (Integer) sessionUserId : null;
    }

    private void refreshSessionProfile(HttpServletRequest httpRequest, int userId) {

        HttpSession session = httpRequest.getSession(false);

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

    private String buildDisplayName(UserDTO user) {

        StringBuilder displayName = new StringBuilder();

        if (user.getFname() != null && !user.getFname().isBlank()) {
            displayName.append(user.getFname().trim());
        }

        if (user.getLname() != null && !user.getLname().isBlank()) {
            if (displayName.length() > 0) {
                displayName.append(' ');
            }
            displayName.append(user.getLname().trim());
        }

        return displayName.length() > 0 ? displayName.toString() : user.getEmail();
    }

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

    private String authTypeName(int authTypeId) {
        try {
            return AuthType.fromId(authTypeId).name();
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * Profile pictures must come from the shared image service (or be an
     * external Google avatar); arbitrary client paths are rejected.
     */
    private boolean isAllowedImageUrl(String url) {
        return imageUploadService.isManagedUrl(FileStorageConfig.SCOPE_PROFILE, url)
                || url.startsWith("http://")
                || url.startsWith("https://");
    }

    private boolean isObjectField(JsonObject object, String key) {
        return object != null
                && object.has(key)
                && object.get(key).isJsonObject();
    }

    private String stringField(JsonObject object, String key, String fallback) {

        if (object == null || !object.has(key) || object.get(key).isJsonNull()) {
            return fallback;
        }

        JsonElement element = object.get(key);

        if (!element.isJsonPrimitive()) {
            return fallback;
        }

        return element.getAsString().trim();
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
            return value != null ? Integer.parseInt(value.toString()) : 0;
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private ResponseEntity<String> json(HttpStatus status, JsonObject body) {
        return ResponseEntity
                .status(status)
                .contentType(MediaType.APPLICATION_JSON)
                .body(AppUtil.gson.toJson(body));
    }

    private ResponseEntity<String> unauthorized(String message) {
        JsonObject response = new JsonObject();

        response.addProperty("status", false);
        response.addProperty("message", message);

        return json(HttpStatus.UNAUTHORIZED, response);
    }

    private ResponseEntity<String> badRequest(String message) {
        JsonObject response = new JsonObject();

        response.addProperty("status", false);
        response.addProperty("message", message);

        return json(HttpStatus.BAD_REQUEST, response);
    }
}