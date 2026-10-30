
package com.goevent.service;

import com.goevent.dto.UserDTO;
import com.goevent.repository.AuthenticationRepo;
import com.goevent.util.AppUtil;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.gson.JsonObject;

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

    public String handleGoogleAuthentication(String idToken) {
        JsonObject responseObject = new JsonObject();

        boolean status = false;
        String message = "";

        try {
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
                            int userStatusId = user.getUserStatusId();

                            if (userStatusId == 2) {
                                message = "Your account is suspended";
                            } else if (userStatusId == 3) {
                                responseObject.addProperty("action", "REGISTRATION_REQUIRED");

                                message = "Please complete your registration";
                                status = true;
                            } else {
                                responseObject.addProperty("action", "LOGIN");

                                //can create login part here

                                message = "Google account verified successfully";
                                status = true;
                            }
                        } else {
                            // 6. Check whether email already exists
                            UserDTO existingUser = authenticationRepo.getUserByEmail(email);

                            if (existingUser != null) {
                                message = "An account with this email already exists. Please use the existing login method.";
                            } else {
                                // 7. Register Google user with pending status
                                int result = authenticationRepo.registerGoogleUser(fname,
                                        lname,
                                        email,
                                        3,// PENDING
                                        1,// USER
                                        googleSub,
                                        profileImgUrl,
                                        1// GOOGLE
                                );

                                if (result > 0) {
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

        } catch (Exception e) {
            message = "Google authentication failed";
            logger.error("Google authentication error", e);
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);

        return AppUtil.gson.toJson(responseObject);
    }
}
