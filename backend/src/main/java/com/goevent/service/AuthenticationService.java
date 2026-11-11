
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
            Role role = (Role) authData.get("role");

            String indexNo = null;
            String uniEmail = null;

            Integer organizationId = null;
            String position = null;

            switch (role) {
                case USER -> {
                    // No additional data
                }
                case STUDENT -> {
                    indexNo = (String) authData.get("index");
                    uniEmail = (String) authData.get("uniEmail");
                }
                case ORGANIZATION -> {
                    organizationId = (Integer) authData.get("orgId");
                    position = (String) authData.get("position");
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
                                    status = false;
                                }
                                case PENDING -> {
                                    responseObject.addProperty("action", "REGISTRATION_REQUIRED");

                                    message = "Please complete your registration";
                                    status = true;
                                }
                                case ACTIVE -> {
                                    responseObject.addProperty("action", "LOGIN");

                                    // Create user session
                                    HttpSession session = httpRequest.getSession(true);

                                    session.setAttribute("userId", user.getId());
                                    session.setAttribute("role", Role.fromId(user.getRoleId()).name());
                                    session.setAttribute("email", user.getEmail());

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

                            if (existingUser != null) {
                                message = "An account with this email already exists. Please use the existing login method.";
                            } else {
                                if (role != Role.USER && role != Role.STUDENT && role != Role.ORGANIZATION) {
                                    message = "Invalid registration role.";
                                }else {
                                    // 8. Register Google user with PENDING status
                                    int result = authenticationRepo.registerGoogleUser(
                                            fname,
                                            lname,
                                            email,
                                            UserStatus.PENDING.getId(),
                                            role.getId(),
                                            googleSub,
                                            profileImgUrl,
                                            1 //GOOGLE
                                    );
                                    if (result > 0) {
                                        UserDTO user2 = authenticationRepo.getUserByEmail(email);
                                        if(user2 != null){
                                            int userId = user2.getId();
                                            switch (role) {
                                                case USER  -> {
                                                    // No additional registration data
                                                }
                                                case STUDENT -> {
                                                    authenticationRepo.registerStudentData(userId,indexNo, uniEmail);
                                                }
                                                case ORGANIZATION -> {
                                                    authenticationRepo.registerOrganizerData(userId,organizationId,position);
                                                }
                                            }
                                        }

                                        responseObject.addProperty("action", "REGISTRATION_REQUIRED");
                                        message = "Google account verified. " + "Please complete your registration.";
                                        status = true;
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
}