
package com.goevent.service;

import com.goevent.dto.UserDTO;
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
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Map;

@Service
public class AuthenticationService {

    private final AuthenticationRepo authenticationRepo;
    private static final Logger logger = AppUtil.getLogger(AuthenticationService.class);

    @Value("${google.client-id}")
    private String googleClientId;

    public AuthenticationService(AuthenticationRepo authenticationRepo) {
        this.authenticationRepo = authenticationRepo;
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

                            if (existingUser != null && existingUser.getAuthTypeId() == 2) {
                                message = "An account with this email already exists. Please use the existing login method.";
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

    private void createUserSession(HttpServletRequest httpRequest, UserDTO user) {
        HttpSession session = httpRequest.getSession(true);

        session.setAttribute("userId", user.getId());
        session.setAttribute("role", Role.fromId(user.getRoleId()).name());
        session.setAttribute("email", user.getEmail());
    }
}