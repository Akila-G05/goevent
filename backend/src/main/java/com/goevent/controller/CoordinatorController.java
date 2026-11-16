package com.goevent.controller;

import com.goevent.dto.CoordinatorRequests.*;
import com.goevent.service.CoordinatorService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.*;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/coordinator")
public class CoordinatorController {
    private final CoordinatorService service;
    private final com.goevent.service.ImageUploadService images;
    public CoordinatorController(CoordinatorService service,com.goevent.service.ImageUploadService images) { this.service=service; this.images=images; }
    private int user(HttpServletRequest request) {
        var session=request.getSession(false);
        if(session==null||!(session.getAttribute("userId") instanceof Integer))throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED,"Ordinary user login required");
        return (Integer)session.getAttribute("userId");
    }
    private Object ok(Object data) { return Map.of("status",true,"data",data); }
    @GetMapping("/csrf") public Object csrf(CsrfToken token) { return Map.of("headerName",token.getHeaderName(),"token",token.getToken()); }
    @GetMapping("/catalog") public Object catalog(HttpServletRequest r) { return ok(service.catalog(user(r))); }
    @GetMapping("/eligibility") public Object eligibility(HttpServletRequest r) { return ok(service.workspaces(user(r))); }
    @GetMapping("/workspaces") public Object workspaces(HttpServletRequest r) { return ok(service.workspaces(user(r))); }
    @GetMapping("/applications") public Object applications(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="25") int size,HttpServletRequest r) { return ok(service.applications(user(r),page,size)); }
    @PostMapping("/applications") public Object apply(@RequestBody Application input,HttpServletRequest r) { return ok(Map.of("id",service.apply(user(r),input))); }
    @PostMapping(value="/documents",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public Object upload(@RequestParam String purpose,@RequestParam MultipartFile file,HttpServletRequest r) throws java.io.IOException { return ok(Map.of("id",service.upload(user(r),purpose,file))); }
    @PostMapping(value="/images",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public Object image(@RequestParam String kind,@RequestParam MultipartFile file,HttpServletRequest r) {
        int user=user(r); if(service.workspaces(user).isEmpty())throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN,"Approved membership required for event images");
        if(!java.util.Set.of("event","banner").contains(kind))throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid image kind");
        return ok(Map.of("path",images.store(kind,user,file)));
    }
    @GetMapping("/documents/{id}") public ResponseEntity<byte[]> document(@PathVariable long id,HttpServletRequest r) {
        var row=service.document(user(r),false,id);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff")
            .header("Content-Disposition","attachment; filename=proof-"+id).contentType(MediaType.parseMediaType(row.get("media_type").toString())).body((byte[])row.get("content"));
    }
    @GetMapping("/workspaces/{org}/statistics") public Object statistics(@PathVariable int org,@RequestParam Instant from,@RequestParam Instant to,@RequestParam(required=false) Integer eventId,HttpServletRequest r) { return ok(service.statistics(user(r),org,from,to,eventId)); }
    @GetMapping("/workspaces/{org}/events") public Object events(@PathVariable int org,@RequestParam(defaultValue="ALL") String phase,
        @RequestParam(required=false) Instant from,@RequestParam(required=false) Instant to,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="25") int size,HttpServletRequest r) { return ok(service.events(user(r),org,phase,from,to,page,size)); }
    @PostMapping("/workspaces/{org}/events") public Object create(@PathVariable int org,@RequestBody Event input,HttpServletRequest r) { return ok(Map.of("id",service.create(user(r),org,input))); }
    @GetMapping("/workspaces/{org}/events/{id}") public Object event(@PathVariable int org,@PathVariable int id,HttpServletRequest r) { return ok(service.detail(user(r),org,id)); }
    @PutMapping("/workspaces/{org}/events/{id}") public Object save(@PathVariable int org,@PathVariable int id,@RequestBody Save input,HttpServletRequest r) { service.save(user(r),org,id,input); return ok(Map.of()); }
    @PostMapping("/workspaces/{org}/events/{id}/submit") public Object submit(@PathVariable int org,@PathVariable int id,@RequestBody Version input,HttpServletRequest r) { service.submit(user(r),org,id,input.revision()); return ok(Map.of()); }
    @PostMapping("/workspaces/{org}/events/{id}/cancel") public Object cancel(@PathVariable int org,@PathVariable int id,@RequestBody Removal input,HttpServletRequest r) { service.remove(user(r),org,id,input,false); return ok(Map.of()); }
    @DeleteMapping("/workspaces/{org}/events/{id}") public Object delete(@PathVariable int org,@PathVariable int id,@RequestBody Removal input,HttpServletRequest r) { service.remove(user(r),org,id,input,true); return ok(Map.of()); }
    @GetMapping("/workspaces/{org}/events/{id}/attendees.csv") public ResponseEntity<String> export(@PathVariable int org,@PathVariable int id,HttpServletRequest r) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("Content-Disposition","attachment; filename=attendees-"+id+".csv").contentType(MediaType.parseMediaType("text/csv;charset=UTF-8")).body(service.export(user(r),org,id));
    }
    @GetMapping("/workspaces/{org}/events/{id}/campaigns") public Object campaigns(@PathVariable int org,@PathVariable int id,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="25") int size,HttpServletRequest r) { return ok(service.campaigns(user(r),org,id,page,size)); }
    @PostMapping("/workspaces/{org}/events/{id}/campaigns") public Object campaign(@PathVariable int org,@PathVariable int id,@RequestBody Campaign input,HttpServletRequest r) { return ok(Map.of("id",service.campaign(user(r),org,id,input))); }
    @PostMapping("/workspaces/{org}/events/{id}/campaigns/{campaign}/cancel") public Object cancelCampaign(@PathVariable int org,@PathVariable int id,@PathVariable long campaign,HttpServletRequest r) { service.cancelCampaign(user(r),org,id,campaign); return ok(Map.of()); }
}
