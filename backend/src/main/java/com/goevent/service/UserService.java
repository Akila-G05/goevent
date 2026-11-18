
package com.goevent.service;

import com.goevent.common.ApiResponse;
import com.goevent.dto.UserDTO;
import com.goevent.dto.UserProfileDTO;
import com.goevent.enums.AuthType;
import com.goevent.enums.Role;
import com.goevent.repository.ContentRepo;
import com.goevent.repository.UserRepo;
import com.goevent.util.AppUtil;
import com.google.gson.JsonObject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import org.slf4j.Logger;
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

        UserProfileDTO profile = buildProfile(userId);

        return profile != null ? ApiResponse.ok(toJson(profile)) : ApiResponse.unauthorized("Not authenticated");
    }

    //update current user profile
    @Transactional
    public ResponseEntity<String> updateCurentUserData(UserProfileDTO input, HttpServletRequest request) {
        Integer userId = currentUserId(request);

        if (userId == null) {
            return ApiResponse.unauthorized("Not authenticated");
        }

        UserDTO user = userRepo.getUserById(userId);

        if (user == null) {
            return ApiResponse.unauthorized("Not authenticated");
        }

        //get clientside value if not exist just use the db values
        String firstName = valueOrCurrent(input.getFirstName(), user.getFname());
        String lastName = valueOrCurrent(input.getLastName(), user.getLname());
        String mobile = valueOrCurrent(input.getMobile(), user.getMobile());

        String previousImage = user.getProfileImgUrl();
        String profileImage = valueOrCurrent(input.getProfileImgUrl(), previousImage);

        // check img url
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

        if (mobile != null && !mobile.isBlank() && !MOBILE.matcher(mobile).matches()) {
            return ApiResponse.badRequest("Enter a valid mobile number");
        }

        if (profileImage != null && profileImage.length() > 200) {
            return ApiResponse.badRequest("Profile image URL is too long");
        }

        if (profileImage != null && !isAllowedImageUrl(profileImage)) {
            return ApiResponse.badRequest("Invalid profile image");
        }

        Role role = roleOf(user.getRoleId());

        String indexNo = null;
        String uniEmail = null;
        Integer universityId = null;

        Integer organizationId = null;
        String position = null;

        //student details
        if (role == Role.STUDENT && input.getStudent() != null) {

            indexNo = trimmed(input.getStudent().getIndexNo());
            uniEmail = trimmed(input.getStudent().getUniEmail());
            universityId = input.getStudent().getUniversityId();

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

            if (universityId == null || !userRepo.universityExists(universityId)) {
                return ApiResponse.badRequest("Select a valid university");
            }
        }

        //oragenizer details
        if (role == Role.ORGANIZER && input.getOrganization() != null) {
            organizationId = input.getOrganization().getOrganizationId();
            position = trimmed(input.getOrganization().getPosition());

            if (organizationId == null || !userRepo.organizationExists(organizationId)) {
                return ApiResponse.badRequest("Select a valid organization");
            }

            Map<String, Object> approved = userRepo.getOrganizerDetail(userId);

            if (approved == null || ((Number) approved.get("organization_id")).intValue() != organizationId) {
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

        //delete old profile image
        if (previousImage != null && !previousImage.equals(profileImage)) {
            fileUploadService.deleteFile(
                FileUploadService.SCOPE_PROFILE, previousImage
            );
        }

        refreshSessionProfile(request, userId);

        UserProfileDTO profile = buildProfile(userId);

        return profile != null
            ? ApiResponse.ok(toJson(profile))
            : ApiResponse.unauthorized("Not authenticated");
    }

    //upload profile image
    public ResponseEntity<String> uploadProfileImage(MultipartFile file, HttpServletRequest request) {

        Integer userId = currentUserId(request);

        if (userId == null) {
            return ApiResponse.unauthorized("Not authenticated");
        }

        String imageUrl = fileUploadService.uploadFile(
                FileUploadService.SCOPE_PROFILE, userId, file
        );

        return ApiResponse.ok(toJson(UserProfileDTO.imageUploaded(imageUrl)));
    }

    //build complete profile response usig dto
    private UserProfileDTO buildProfile(int userId) {

        UserDTO user = userRepo.getUserById(userId);

        if (user == null) {
            return null;
        }

        Map<String, Object> studentRow = userRepo.getStudentDetail(userId);

        //calling UserProfileDTO subcalss contructor and create obj
        UserProfileDTO.StudentDTO student = studentRow == null ? null
            : new UserProfileDTO.StudentDTO(
                stringValue(studentRow.get("index_no")),
                stringValue(studentRow.get("uni_email")),
                intValue(studentRow.get("university_id")),
                stringValue(studentRow.get("university_name")));

        Map<String, Object> organizerRow = userRepo.getOrganizerDetail(userId);

        UserProfileDTO.OrganizationDTO organization = organizerRow == null ? null
            : new UserProfileDTO.OrganizationDTO(
                intValue(organizerRow.get("organization_id")),
                stringValue(organizerRow.get("organization_name")),
                stringValue(organizerRow.get("position")));

        UserProfileDTO.OptionsDTO options = new UserProfileDTO.OptionsDTO(
            contentRepo.getUniversities(),
            contentRepo.getOrganizations()
        );

        return new UserProfileDTO(
            true,
            user.getFname(),
            user.getLname(),
            buildDisplayName(user),
            user.getEmail(),
            user.getMobile(),
            roleName(user.getRoleId()),
            authTypeName(user.getAuthTypeId()),
            user.getProfileImgUrl(),
            user.getRegisteredDate() != null
                    ? user.getRegisteredDate().toLocalDateTime().toLocalDate().toString()
                    : null,
            student,
            organization,
            options
        );
    }

    private static JsonObject toJson(UserProfileDTO profile) {
        return AppUtil.gson.toJsonTree(profile).getAsJsonObject();
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

    private void refreshSessionProfile(HttpServletRequest request, int userId) {

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

    //get role name
    private String roleName(int roleId) {
        Role role = roleOf(roleId);
        return role != null ? role.name() : null;
    }

    //validate the role using enum
    private Role roleOf(int roleId) {
        try {
            return Role.fromId(roleId);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    //get authentication type
    private String authTypeName(int authTypeId) {
        try {
            return AuthType.fromId(authTypeId).name();
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    //vlidate profile image url
    private boolean isAllowedImageUrl(String url) {
        return fileUploadService.isOwnUrl(
                FileUploadService.SCOPE_PROFILE, url
        ) || url.startsWith("http://") || url.startsWith("https://");
    }

    private static String valueOrCurrent(String value, String current) {
        return value == null ? current : value.trim();
    }

    private static String trimmed(String value) {
        return value == null ? null : value.trim();
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
