package com.goevent.controller;

import com.goevent.dto.ContactRequest;
import com.goevent.service.ContactService;
import com.goevent.service.ContactThrottle;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/contact")
public class ContactController {
    private final ContactService service;
    private final ContactThrottle throttle;
    public ContactController(ContactService service, ContactThrottle throttle) { this.service = service; this.throttle = throttle; }
    @GetMapping("/csrf") public Object csrf(CsrfToken token) { return Map.of("headerName", token.getHeaderName(), "token", token.getToken()); }
    @PostMapping public Object submit(@RequestBody ContactRequest input, HttpServletRequest request) {
        throttle.checkContact(request.getRemoteAddr());
        return Map.of("status", true, "id", service.submit(input));
    }
}
