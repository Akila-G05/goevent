package com.goevent.controller;

import com.goevent.dto.AdminRequests.*;
import com.goevent.service.AdminManagementService;
import com.goevent.service.AdminStatisticsService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/admin")
public class AdminController {
    private final AdminManagementService service;
    private final AdminStatisticsService statistics;
    public AdminController(AdminManagementService service,AdminStatisticsService statistics) { this.service=service; this.statistics=statistics; }
    private int actor(HttpServletRequest request) { return (Integer)request.getSession(false).getAttribute("adminUserId"); }
    private int offset(int page,int size) {
        if(page<0||page>100000||size<1||size>100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid pagination");
        return page*size;
    }
    private Map<String,Object> ok(Object data) { return Map.of("status",true,"data",data); }
    @GetMapping("/accounts") public Object accounts(@RequestParam(required=false) Integer role,@RequestParam(required=false) Integer status,
        @RequestParam(defaultValue="") String search,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="25") int size) {
        int offset=offset(page,size); return ok(service.accounts(role,status,search,size,offset));
    }
    @GetMapping("/accounts/{id}") public Object account(@PathVariable int id) { return ok(service.detail(id)); }
    @PostMapping("/accounts") public Object create(@RequestBody Account input,HttpServletRequest request) { return ok(Map.of("id",service.create(actor(request),input))); }
    @PutMapping("/accounts/{id}") public Object edit(@PathVariable int id,@RequestBody Account input,HttpServletRequest request) { service.edit(actor(request),id,input); return ok(Map.of()); }
    @PostMapping("/accounts/{id}/disable") public Object disable(@PathVariable int id,@RequestBody Reason input,HttpServletRequest request) { service.access(actor(request),id,false,input.reason()); return ok(Map.of()); }
    @PostMapping("/accounts/{id}/enable") public Object enable(@PathVariable int id,@RequestBody Reason input,HttpServletRequest request) { service.access(actor(request),id,true,input.reason()); return ok(Map.of()); }
    @DeleteMapping("/accounts/{id}") public Object delete(@PathVariable int id,@RequestBody Reason input,HttpServletRequest request) { service.delete(actor(request),id,input.reason()); return ok(Map.of()); }
    @GetMapping("/coordinator-requests") public Object coordinatorRequests(@RequestParam(required=false) Integer status,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="25") int size) {
        int offset=offset(page,size); return ok(service.requests(status,size,offset));
    }
    @PostMapping("/coordinator-requests/{id}/decision") public Object decide(@PathVariable long id,@RequestBody Decision input,HttpServletRequest request) { service.decideRequest(actor(request),id,input); return ok(Map.of()); }
    @PostMapping("/accounts/{id}/revoke-coordinator") public Object revoke(@PathVariable int id,@RequestBody Reason input,HttpServletRequest request) { service.revoke(actor(request),id,input.reason()); return ok(Map.of()); }
    @GetMapping("/events") public Object events(@RequestParam(required=false) Integer status,@RequestParam(defaultValue="ALL") String phase,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="25") int size) {
        int offset=offset(page,size); return ok(service.events(status,phase,size,offset));
    }
    @GetMapping("/events/{id}") public Object event(@PathVariable int id) { return ok(service.event(id)); }
    @PutMapping("/events/{id}") public Object editEvent(@PathVariable int id,@RequestBody EventEdit input,HttpServletRequest request) { service.editEvent(actor(request),id,input); return ok(Map.of()); }
    @PostMapping("/events/{id}/decision") public Object decideEvent(@PathVariable int id,@RequestBody EventDecision input,HttpServletRequest request) { service.decideEvent(actor(request),id,input); return ok(Map.of()); }
    @PostMapping("/events/{id}/disable") public Object disableEvent(@PathVariable int id,@RequestBody Reason input,HttpServletRequest request) { service.disableEvent(actor(request),id,input.reason()); return ok(Map.of()); }
    @DeleteMapping("/events/{id}") public Object deleteEvent(@PathVariable int id,@RequestBody Reason input,HttpServletRequest request) { service.deleteEvent(actor(request),id,input.reason()); return ok(Map.of()); }
    @GetMapping("/contacts") public Object contacts(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="25") int size) { int offset=offset(page,size); return ok(service.contacts(size,offset)); }
    @GetMapping("/contacts/{id}") public Object contact(@PathVariable long id) { return ok(service.contact(id)); }
    @PostMapping("/contacts/{id}/reply") public Object reply(@PathVariable long id,@RequestBody Reply input,HttpServletRequest request) { service.reply(actor(request),id,input.message()); return ok(Map.of("delivery","QUEUED")); }
    @GetMapping("/audit") public Object audit(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="25") int size) { int offset=offset(page,size); return ok(service.audit(size,offset)); }
    @GetMapping("/emails") public Object emails(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="25") int size) { int offset=offset(page,size); return ok(service.emails(size,offset)); }
    @PostMapping("/emails/{id}/retry") public Object retryEmail(@PathVariable long id,@RequestBody Reason input,HttpServletRequest request) { service.retryEmail(actor(request),id,input.reason()); return ok(Map.of("delivery","QUEUED")); }
    @GetMapping("/statistics") public Object statistics(@RequestParam Instant from,@RequestParam Instant to,@RequestParam(required=false) Integer userId) { return ok(statistics.report(from,to,userId)); }
}
