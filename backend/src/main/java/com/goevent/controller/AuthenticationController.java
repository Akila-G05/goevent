package com.goevent.controller;

import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthenticationController {
    @PostMapping("/google-register")
    public String googleRegister(@RequestBody Map<String, String> request) {
        String idToken = request.get("idToken");

        System.out.println("Authentication request received");
        System.out.println("Token received: " + idToken);

        return "Google authentication endpoint working!";
    }
}
