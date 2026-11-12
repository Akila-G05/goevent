package com.goevent.controller;

import com.goevent.service.AuthenticationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Sign-up endpoints. Sign-in endpoints live in {@link AuthenticationController}.
 */
@RestController
@RequestMapping("/auth")
public class RegistrationController {

    private final AuthenticationService authenticationService;

    public RegistrationController(AuthenticationService authenticationService) {
        this.authenticationService = authenticationService;
    }

    @PostMapping("/register")
    public String manualRegistration(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        return authenticationService.handleManualRegistration(request, httpRequest);
    }
}
