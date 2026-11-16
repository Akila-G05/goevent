package com.goevent.controller;

import com.goevent.dto.CoordinatorRequests.*;
import com.goevent.dto.AdminRequests.Reason;
import com.goevent.service.CoordinatorService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import java.util.Map;

@RestController
@RequestMapping("/admin")
public class CoordinatorAdminController {
    private final CoordinatorService service;
    public CoordinatorAdminController(CoordinatorService service) { this.service=service; }
    private int actor(HttpServletRequest r) { return (Integer)r.getSession(false).getAttribute("adminUserId"); }
    @PostMapping("/coordinator-applications/{id}/decision") public Object review(@PathVariable long id,@RequestBody Review input,HttpServletRequest r) { service.reviewApplication(actor(r),id,input); return Map.of("status",true); }
    @GetMapping("/accounts/{id}/memberships") public Object memberships(@PathVariable int id) { return Map.of("status",true,"data",service.memberships(id)); }
    @PostMapping("/memberships/{id}/revoke") public Object revoke(@PathVariable long id,@RequestBody Reason input,HttpServletRequest r) { service.revokeMembership(actor(r),id,input.reason()); return Map.of("status",true); }
    @PostMapping("/events/{id}/organization") public Object assign(@PathVariable int id,@RequestBody Assignment input,HttpServletRequest r) { service.assign(actor(r),id,input); return Map.of("status",true); }
    @GetMapping("/event-revisions/{id}") public Object revision(@PathVariable long id,HttpServletRequest r) { return Map.of("status",true,"data",service.adminRevision(actor(r),id)); }
    @GetMapping("/private-documents/{id}") public ResponseEntity<byte[]> document(@PathVariable long id,HttpServletRequest r) {
        var row=service.document(actor(r),true,id);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff").header("Content-Disposition","attachment; filename=proof-"+id).contentType(MediaType.parseMediaType(row.get("media_type").toString())).body((byte[])row.get("content"));
    }
}
