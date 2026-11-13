package com.goevent.service;

import com.goevent.dto.UserDTO;
import com.goevent.enums.Role;
import com.goevent.repository.UserRepo;
import com.goevent.util.AppUtil;
import com.google.gson.JsonObject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepo userRepo;

    public UserService(UserRepo userRepo) {
        this.userRepo = userRepo;
    }


    //Returns the profile of the signed-in user. The user is resolved from the
    public ResponseEntity<String> getCurrentUserData(HttpServletRequest httpRequest) {

        HttpSession session = httpRequest.getSession(false);
        Object sessionUserId = session != null ? session.getAttribute("userId") : null;

        if (!(sessionUserId instanceof Integer)) {
            return unauthorized("Not authenticated");
        }

        UserDTO user = userRepo.getUserById((Integer) sessionUserId);

        if (user == null) {
            // Session points at a user that no longer exists.
            return unauthorized("Not authenticated");
        }

        JsonObject responseObject = new JsonObject();

        responseObject.addProperty("status", true);
        responseObject.addProperty("firstName", user.getFname());
        responseObject.addProperty("lastName", user.getLname());
        responseObject.addProperty("name", buildDisplayName(user));
        responseObject.addProperty("email", user.getEmail());
        responseObject.addProperty("mobile", user.getMobile());
        responseObject.addProperty("role", roleName(user.getRoleId()));
        responseObject.addProperty("profileImgUrl", user.getProfileImgUrl());
        responseObject.addProperty(
                "registeredDate",
                user.getRegisteredDate() != null
                        ? user.getRegisteredDate().toLocalDateTime().toLocalDate().toString()
                        : null
        );

        return ResponseEntity.ok(AppUtil.gson.toJson(responseObject));
    }

    private ResponseEntity<String> unauthorized(String message) {
        JsonObject responseObject = new JsonObject();

        responseObject.addProperty("status", false);
        responseObject.addProperty("message", message);

        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(AppUtil.gson.toJson(responseObject));
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
        try {
            return Role.fromId(roleId).name();
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
