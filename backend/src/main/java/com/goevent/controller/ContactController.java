package com.goevent.controller;

import com.goevent.dto.AdminRequests.Contact;
import com.goevent.service.AdminManagementService;
import com.goevent.service.AdminLoginThrottle;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/contact")
public class ContactController {
    private final AdminManagementService service;
    private final AdminLoginThrottle throttle;
    public ContactController(AdminManagementService service,AdminLoginThrottle throttle) { this.service=service; this.throttle=throttle; }
    @GetMapping("/csrf") public Object csrf(CsrfToken token) { return Map.of("headerName",token.getHeaderName(),"token",token.getToken()); }
    @PostMapping public Object submit(@RequestBody Contact input,HttpServletRequest request) {
        throttle.checkContact(request.getRemoteAddr());
        return Map.of("status",true,"id",service.contact(input));
    }
}
