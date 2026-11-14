package com.goevent.service;

import com.goevent.repository.AuthenticationRepo;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;

@Service
public class AdminAuthenticationService {
    private final AuthenticationRepo users;
    private final PasswordEncoder passwords;
    private final AdminLoginThrottle throttle;
    private final String dummyHash;
    public AdminAuthenticationService(AuthenticationRepo users, PasswordEncoder passwords, AdminLoginThrottle throttle) {
        this.users = users; this.passwords = passwords; this.throttle = throttle;
        this.dummyHash = passwords.encode(java.util.UUID.randomUUID().toString());
    }
    public Map<String, Object> login(String email, String password, HttpServletRequest request) {
        if (email == null || email.isBlank() || email.length() > 100 || password == null || password.isEmpty()
                || password.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid credentials");
        email = email.trim().toLowerCase(Locale.ROOT);
        throttle.check(email, request.getRemoteAddr());
        var user = users.getUserByEmail(email);
        String hash = user != null && user.getPassword() != null ? user.getPassword() : dummyHash;
        boolean matches = passwords.matches(password, hash);
        if (!matches || user == null || user.getRoleId() != 3 || user.getUserStatusId() != 1
                || user.getPassword() == null)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        var old = request.getSession(false);
        if (old != null) old.invalidate();
        request.getSession(true).setAttribute("adminUserId", user.getId());
        return Map.of("status", true, "userId", user.getId(), "role", "ADMIN");
    }
}
