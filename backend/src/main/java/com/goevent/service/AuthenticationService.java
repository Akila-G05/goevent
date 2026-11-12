
package com.goevent.service;

import com.goevent.dto.UserDTO;
import com.goevent.enums.AuthType;
import com.goevent.enums.Role;
import com.goevent.enums.UserStatus;
import com.goevent.repository.AuthenticationRepo;
import com.goevent.util.AppUtil;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.gson.JsonObject;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class AuthenticationService {

    private static final Logger logger = AppUtil.getLogger(AuthenticationService.class);
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final int MAX_PASSWORD_LENGTH = 15; // maximum plain-text password length

    private final AuthenticationRepo authenticationRepo;
    private final PasswordEncoder passwordEncoder;

    @Value("${google.client-id}")
    private String googleClientId;

    public AuthenticationService(AuthenticationRepo authenticationRepo, PasswordEncoder passwordEncoder) {
        this.authenticationRepo = authenticationRepo;
        this.passwordEncoder = passwordEncoder;
    }

    public String handleGoogleAuthentication(Map<String, Object> authData, HttpServletRequest httpRequest) {
        JsonObject responseObject = new JsonObject();

        boolean status = false;
        String message = "";

        try {
            String idToken = (String) authData.get("idToken");
            Object roleObj = authData.get("roleId");
            Role role = null;
            if (roleObj instanceof Integer rId) {
                try {
                    role = Role.fromId(rId);
                } catch (Exception ignored) {}
            }

            String indexNo = null;
            String uniEmail = null;
            Integer uniId = null;

            Integer organizationId = null;
            String position = null;

            if (role != null) {
                switch (role) {
                    case USER -> {
                        // No additional data
                    }
                    case STUDENT -> {
                        indexNo = (String) authData.get("index");
                        uniEmail = (String) authData.get("uniEmail");
                        uniId = (Integer) authData.get("uniId");
                    }
                    case ORGANIZER -> {
                        organizationId = (Integer) authData.get("orgId");
                        position = (String) authData.get("position");
                    }
                    default -> {}
                }
            }

            // 1. Validate ID token
            if (idToken == null || idToken.isBlank()) {
                message = "Google ID token is missing";
            } else {
                // 2. Create Google token verifier
                GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                        new NetHttpTransport(),
                        GsonFactory.getDefaultInstance()
                ).setAudience(Collections.singletonList(googleClientId)).build();

                // 3. Verify Google ID token
                GoogleIdToken verifiedToken = verifier.verify(idToken);

                if (verifiedToken == null) {
                    message = "Invalid Google ID token";
                } else {
                    // 4. Extract Google user information
                    GoogleIdToken.Payload payload = verifiedToken.getPayload();

                    String googleSub = payload.getSubject();
                    String email = payload.getEmail();

                    String fname = (String) payload.get("given_name");
                    String lname = (String) payload.get("family_name");
                    String profileImgUrl = (String) payload.get("picture");

                    Boolean emailVerified = payload.getEmailVerified();

                    if (email == null || !Boolean.TRUE.equals(emailVerified)) {
                        message = "Google email is not verified";
                    } else {
                        // 5. Check existing Google user
                        UserDTO user = authenticationRepo.getUserByGoogleSub(googleSub);

                        if (user != null) {
                            // Convert database ID into enum
                            UserStatus userStatus = UserStatus.fromId(user.getUserStatusId());

                            switch (userStatus) {
                                case SUSPENDED -> {
                                    message = "Your account is suspended";
                                }
                                case PENDING -> {
                                    message = "Your account under the review. Please contact the admin";
                                }
                                case ACTIVE -> {
                                    responseObject.addProperty("action", "LOGIN");

                                    // Create user session
                                    createUserSession(httpRequest, user);

                                    responseObject.addProperty("userId", user.getId());
                                    responseObject.addProperty("roleId", Role.fromId(user.getRoleId()).name());
                                    responseObject.addProperty("email", user.getEmail());

                                    message = "Google login successful";
                                    status = true;
                                }
                            }
                        } else {
                            // 6. Check whether email already exists
                            UserDTO existingUser = authenticationRepo.getUserByEmail(email);

                            if (existingUser != null && existingUser.getAuthTypeId() == AuthType.MANUAL.getId()) {
                                // Point the user at the login method they actually registered with.
                                message = "This email is already registered with a password. Please sign in with your email and password.";
                            } else {
                                if (role == null) {
                                    // Initial Google sign-in/verification: user does not exist yet.
                                    // Return REGISTRATION_REQUIRED so the frontend opens the Role Selection popup.
                                    responseObject.addProperty("action", "REGISTRATION_REQUIRED");
                                    message = "Google account verified. Please complete your registration.";
                                    status = true;
                                } else if (role != Role.USER && role != Role.STUDENT && role != Role.ORGANIZER) {
                                    message = "Invalid registration role.";
                                } else if (role == Role.STUDENT && (indexNo == null || indexNo.isBlank() || uniEmail == null || uniEmail.isBlank() || uniId == null)) {
                                    message = "Student registration details are incomplete.";
                                } else if (role == Role.ORGANIZER
                                        && (organizationId == null || position == null || position.isBlank())) {
                                    message = "Organization registration details are incomplete.";
                                } else {
                                    int statusId = UserStatus.ACTIVE.getId();
                                    if(role == Role.ORGANIZER){
                                        statusId = UserStatus.PENDING.getId();
                                    }
                                    // 8. Register Google user with the resolved status
                                    int result = authenticationRepo.registerGoogleUser(
                                            fname,
                                            lname,
                                            email,
                                            statusId,
                                            role.getId(),
                                            googleSub,
                                            profileImgUrl,
                                            1 //GOOGLE
                                    );
                                    if (result > 0) {
                                        UserDTO registeredUser = authenticationRepo.getUserByEmail(email);

                                        if (registeredUser != null) {
                                            int userId = registeredUser.getId();
                                            switch (role) {
                                                case USER  -> {
                                                    // No additional registration data
                                                }
                                                case STUDENT -> {
                                                    authenticationRepo.registerStudentData(userId, indexNo, uniEmail, uniId);
                                                }
                                                case ORGANIZER -> {
                                                    authenticationRepo.registerOrganizerData(userId, organizationId, position);
                                                }
                                                default -> {}
                                            }

                                            if (statusId == UserStatus.ACTIVE.getId()) {
                                                // Approved registrations are signed in immediately
                                                createUserSession(httpRequest, registeredUser);

                                                responseObject.addProperty("action", "REGISTERED");
                                                responseObject.addProperty("userId", registeredUser.getId());
                                                responseObject.addProperty("roleId", Role.fromId(registeredUser.getRoleId()).name());
                                                responseObject.addProperty("email", registeredUser.getEmail());

                                                message = "Google registration successful";
                                            } else {
                                                // Pending review: no session until an admin approves the account
                                                responseObject.addProperty("action", "REGISTRATION_PENDING");
                                                message = "Your registration was submitted and is waiting for admin approval.";
                                            }
                                            status = true;
                                        } else {
                                            message = "Failed to register Google user";
                                        }
                                    } else {
                                        message = "Failed to register Google user";
                                    }
                                }
                            }
                        }
                    }
                }
            }

        } catch (Exception e) {
            message = "Google authentication failed";
            logger.error("Google authentication error", e);
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);

        return AppUtil.gson.toJson(responseObject);
    }

    public String handleManualRegistration(Map<String, String> authData, HttpServletRequest httpRequest) {
        JsonObject responseObject = new JsonObject();

        boolean status = false;
        String message = "";

        try {
            String fname = trimToNull(authData.get("fname"));
            String lname = trimToNull(authData.get("lname"));
            String email = trimToNull(authData.get("email"));
            String password = authData.get("password");
            String confirmPassword = authData.get("confirmPassword");

            Role role = parseSelfRegistrationRole(authData.get("roleId"));

            String indexNo = trimToNull(authData.get("index"));
            String uniEmail = trimToNull(authData.get("uniEmail"));
            Integer uniId = parseIntOrNull(authData.get("uniId"));
            Integer organizationId = parseIntOrNull(authData.get("orgId"));
            String position = trimToNull(authData.get("position"));

            if (fname == null || lname == null) {
                message = "First name and last name are required.";
            } else if (fname.length() > 45 || lname.length() > 45) {
                message = "First name and last name must not exceed 45 characters.";
            } else if (email == null || email.length() > 100 || !EMAIL_PATTERN.matcher(email).matches()) {
                message = "Please enter a valid email address.";
            } else if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
                message = "Password must be at least " + MIN_PASSWORD_LENGTH + " characters.";
            } else if (password.length() > MAX_PASSWORD_LENGTH) {
                message = "Password must not exceed " + MAX_PASSWORD_LENGTH + " characters.";
            } else if (!password.equals(confirmPassword)) {
                message = "Passwords do not match.";
            } else if (role == null) {
                message = "Please select a valid role.";
            } else if (role == Role.STUDENT
                    && (indexNo == null || uniEmail == null || uniId == null)) {
                message = "Student registration details are incomplete.";
            } else if (role == Role.ORGANIZER
                    && (organizationId == null || position == null)) {
                message = "Organization registration details are incomplete.";
            } else {
                email = email.toLowerCase(Locale.ROOT);

                UserDTO existingUser = authenticationRepo.getUserByEmail(email);

                if (existingUser != null) {
                    if (existingUser.getAuthTypeId() == AuthType.GOOGLE.getId()) {
                        message = "This email is already registered with Google. Please sign in with Google.";
                    } else {
                        message = "An account with this email already exists. Please sign in.";
                    }
                } else {
                    int statusId = role == Role.ORGANIZER
                            ? UserStatus.PENDING.getId()
                            : UserStatus.ACTIVE.getId();

                    int result = authenticationRepo.registerManualUser(
                            fname,
                            lname,
                            email,
                            passwordEncoder.encode(password),
                            statusId,
                            role.getId()
                    );

                    if (result > 0) {
                        UserDTO registeredUser = authenticationRepo.getUserByEmail(email);

                        if (registeredUser == null) {
                            message = "Failed to register user";
                        } else {
                            switch (role) {
                                case STUDENT ->
                                        authenticationRepo.registerStudentData(registeredUser.getId(), indexNo, uniEmail, uniId);
                                case ORGANIZER ->
                                        authenticationRepo.registerOrganizerData(registeredUser.getId(), organizationId, position);
                                default -> {
                                }
                            }

                            if (statusId == UserStatus.ACTIVE.getId()) {
                                // Manual registrations do not open a session; the user signs in explicitly.
                                responseObject.addProperty("action", "REGISTERED");
                                responseObject.addProperty("userId", registeredUser.getId());
                                responseObject.addProperty("roleId", Role.fromId(registeredUser.getRoleId()).name());
                                responseObject.addProperty("email", registeredUser.getEmail());

                                message = "Registration successful";
                            } else {
                                // Pending review: no session until an admin approves the account
                                responseObject.addProperty("action", "REGISTRATION_PENDING");
                                message = "Your registration was submitted and is waiting for admin approval.";
                            }

                            status = true;
                        }
                    } else {
                        message = "Failed to register user";
                    }
                }
            }
        } catch (Exception e) {
            message = "Registration failed";
            logger.error("Manual registration error", e);
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);

        return AppUtil.gson.toJson(responseObject);
    }

    public String handleManualAuthentication(Map<String, String> authData, HttpServletRequest httpRequest) {
        JsonObject responseObject = new JsonObject();

        boolean status = false;
        String message = "";

        try {
            String email = trimToNull(authData.get("email"));
            String password = authData.get("password");

            if (email == null || password == null || password.isEmpty()) {
                message = "Email and password are required.";
            } else {
                UserDTO user = authenticationRepo.getUserByEmail(email.toLowerCase(Locale.ROOT));

                if (user != null && user.getAuthTypeId() == AuthType.GOOGLE.getId()) {
                    // Point the user at the login method they actually registered with.
                    message = "This email is already registered with Google. Please sign in with Google.";
                } else if (user == null
                        || user.getPassword() == null
                        || !passwordEncoder.matches(password, user.getPassword())) {
                    // Unknown emails stay indistinguishable from a wrong password.
                    message = "Invalid email or password";
                } else {
                    switch (UserStatus.fromId(user.getUserStatusId())) {
                        case SUSPENDED -> message = "Your account is suspended";
                        case PENDING -> message = "Your account under the review. Please contact the admin";
                        case ACTIVE -> {
                            responseObject.addProperty("action", "LOGIN");

                            // Manual sign-in creates the session
                            createUserSession(httpRequest, user);

                            responseObject.addProperty("userId", user.getId());
                            responseObject.addProperty("roleId", Role.fromId(user.getRoleId()).name());
                            responseObject.addProperty("email", user.getEmail());

                            message = "Login successful";
                            status = true;
                        }
                    }
                }
            }
        } catch (Exception e) {
            message = "Login failed";
            logger.error("Manual login error", e);
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);

        return AppUtil.gson.toJson(responseObject);
    }

    private Role parseSelfRegistrationRole(String roleId) {
        Integer id = parseIntOrNull(roleId);

        if (id == null) {
            return null;
        }

        return switch (id) {
            case 1 -> Role.USER;
            case 2 -> Role.ORGANIZER;
            case 4 -> Role.STUDENT;
            default -> null;
        };
    }

    private Integer parseIntOrNull(String value) {
        try {
            String trimmed = trimToNull(value);
            return trimmed == null ? null : Integer.parseInt(trimmed);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void createUserSession(HttpServletRequest httpRequest, UserDTO user) {
        HttpSession session = httpRequest.getSession(true);

        session.setAttribute("userId", user.getId());
        session.setAttribute("role", Role.fromId(user.getRoleId()).name());
        session.setAttribute("email", user.getEmail());
    }
}