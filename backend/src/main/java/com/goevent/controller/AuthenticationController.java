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
        int roleId = Integer.parseInt(request.get("roleId"));

        // Create authentication data map
        Map<String, Object> authData = new HashMap<>();

        authData.put("idToken", idToken);
        authData.put("roleId", roleId);

        if (roleId == 1) { // USER
            // No additional parameters
        }else if (roleId == 4) { // STUDENT
            String index = request.get("index");
            String uniEmail = request.get("uniEmail");
            int uniId = Integer.parseInt(request.get("uniId"));

            authData.put("index", index);
            authData.put("uniEmail", uniEmail);
            authData.put("uniId", uniId);
        } else if (roleId == 2) { // ORGANIZATION
            int orgId = Integer.parseInt(request.get("orgId"));
            String position = request.get("position");

            authData.put("orgId", orgId);
            authData.put("position", position);
        }

        return authenticationService.handleGoogleAuthentication(
                authData,
                httpRequest
        );
    }
}