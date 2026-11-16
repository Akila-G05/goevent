package com.goevent.controller;

import com.goevent.service.PublicEventService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.web.csrf.CsrfToken;
import java.util.Map;

@RestController
@RequestMapping("/public-events")
public class PublicEventController {
    private final PublicEventService service;
    public PublicEventController(PublicEventService service) { this.service=service; }
    @GetMapping("/csrf") public Object csrf(CsrfToken token) { return Map.of("headerName",token.getHeaderName(),"token",token.getToken()); }
    @GetMapping public Object list(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="25") int size) { return Map.of("status",true,"data",service.list(page,size)); }
    @GetMapping("/{id}") public Object event(@PathVariable int id) { return Map.of("status",true,"data",service.event(id)); }
    @PostMapping("/{id}/impressions") public Object impression(@PathVariable int id,HttpServletRequest request) { service.impression(id,request.getSession().getId()); return Map.of("status",true); }
}
