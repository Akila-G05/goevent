package com.goevent.controller;

import com.goevent.service.AdminAuthenticationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/admin/auth")
public class AdminAuthenticationController {
    private final AdminAuthenticationService service;
    public AdminAuthenticationController(AdminAuthenticationService service) { this.service = service; }
    public record Credentials(String email, String password) {}
    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
    }
    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Credentials input, HttpServletRequest request) {
        return service.login(input.email(), input.password(), request);
    }
    @GetMapping("/session")
    public Map<String, Object> session(HttpServletRequest request) {
        return Map.of("status", true, "userId", request.getSession(false).getAttribute("adminUserId"), "role", "ADMIN");
    }
    @PostMapping("/logout")
    public Map<String, Boolean> logout(HttpServletRequest request) {
        request.getSession(false).invalidate();
        return Map.of("status", true);
    }
}
