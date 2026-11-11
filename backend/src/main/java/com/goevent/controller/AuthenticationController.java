package com.goevent.controller;

import com.goevent.service.AuthenticationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthenticationController {
    private AuthenticationService authenticationService;

    public AuthenticationController(AuthenticationService authenticationService) {
        this.authenticationService = authenticationService;
    }

    @PostMapping("/google")
    public String googleAuthentication(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String idToken = request.get("idToken");
        String roleIdStr = request.get("roleId");

        // Create authentication data map
        Map<String, Object> authData = new HashMap<>();
        authData.put("idToken", idToken);

        // If roleId is supplied (i.e. user completing role selection modal)
        if (roleIdStr != null && !roleIdStr.isBlank()) {
            try {
                int roleId = Integer.parseInt(roleIdStr);
                authData.put("roleId", roleId);

                if (roleId == 1) { // USER
                    // No additional parameters
                } else if (roleId == 4) { // STUDENT
                    String index = request.get("index");
                    String uniEmail = request.get("uniEmail");
                    String uniIdStr = request.get("uniId");

                    authData.put("index", index);
                    authData.put("uniEmail", uniEmail);
                    if (uniIdStr != null && !uniIdStr.isBlank()) {
                        authData.put("uniId", Integer.parseInt(uniIdStr));
                    }
                } else if (roleId == 2) { // ORGANIZATION
                    String orgIdStr = request.get("orgId");
                    String position = request.get("position");

                    if (orgIdStr != null && !orgIdStr.isBlank()) {
                        authData.put("orgId", Integer.parseInt(orgIdStr));
                    }
                    authData.put("position", position);
                }
            } catch (NumberFormatException e) {
                // If invalid role format, proceed without throwing 500
            }
        }

        return authenticationService.handleGoogleAuthentication(
                authData,
                httpRequest
        );
    }
}