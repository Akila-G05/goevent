package com.goevent.controller;

import com.goevent.dto.AdminRequests.Coordinator;
import com.goevent.service.AdminManagementService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/coordinator-requests")
public class CoordinatorRequestController {
    private final AdminManagementService service;
    public CoordinatorRequestController(AdminManagementService service) { this.service=service; }
    private int user(HttpServletRequest request) {
        Object id=request.getSession(false).getAttribute("userId");
        if(!(id instanceof Integer)) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,"Ordinary user login required");
        return (Integer)id;
    }
    @GetMapping("/csrf") public Object csrf(CsrfToken token) { return Map.of("headerName",token.getHeaderName(),"token",token.getToken()); }
    @GetMapping public Object own(HttpServletRequest request) { return Map.of("status",true,"data",service.ownRequests(user(request))); }
    @PostMapping public Object submit(@RequestBody Coordinator input,HttpServletRequest request) { return Map.of("status",true,"id",service.requestCoordinator(user(request),input)); }
}
