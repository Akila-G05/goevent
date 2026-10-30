package com.goevent.controller;

import com.goevent.service.AuthenticationService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthenticationController {
    private AuthenticationService authenticationService;

    public AuthenticationController(AuthenticationService authenticationService) {
        this.authenticationService = authenticationService;
    }

    @PostMapping("/google")
    public String googleAuthentication(@RequestBody Map<String, String> request) {
        String idToken = request.get("idToken");

        System.out.println("Authentication request received");
        System.out.println("Token received: " + idToken);

        return authenticationService.handleGoogleAuthentication(idToken);
    }
}
