package com.goevent.service;

import com.goevent.dto.AdminRequests.*;
import com.goevent.repository.AdminRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class AdminManagementService {
    private final AdminRepository db;
    private final PasswordEncoder passwords;
    public AdminManagementService(AdminRepository db,PasswordEncoder passwords) { this.db=db; this.passwords=passwords; }
    static void require(boolean condition,int status,String message) {
        if(!condition) throw new ResponseStatusException(HttpStatus.valueOf(status),message);
    }
    static String text(String value,int max,String field) {
        require(value!=null && !value.isBlank() && value.length()<=max,400,"Invalid "+field); return value.trim();
    }
    static String email(String email) {
        email=text(email,100,"email").toLowerCase(Locale.ROOT);
        require(email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"),400,"Invalid email"); return email;
    }
    private void lockAdmin(int actor) { db.lock(); require(db.admin(actor),403,"Active admin required"); }
    private Map<String,Object> account(int id) { var value=db.account(id); require(value!=null,404,"Account not found"); return value; }
    static int number(Map<String,Object> row,String field) { return ((Number)row.get(field)).intValue(); }
    public List<Map<String,Object>> accounts(Integer role,Integer status,String search,int limit,int offset) {
        require(role==null || Set.of(1,2,3,4,5).contains(role),400,"Invalid role");
        require(status==null || Set.of(1,2,3).contains(status),400,"Invalid status");
        require(search.length()<=100,400,"Search too long"); return db.accounts(role,status,search,limit,offset);
    }
    public Map<String,Object> detail(int id) { return account(id); }
    @Transactional public long create(int actor,Account input) {
        lockAdmin(actor); String reason=text(input.reason(),1000,"reason");
        int role=Objects.requireNonNullElse(input.roleId(),1), status=Objects.requireNonNullElse(input.statusId(),1);
        require(Set.of(1,2,3,4,5).contains(role)&&Set.of(1,2,3).contains(status),400,"Invalid role/status");
        String email=email(input.email()); require(!db.emailTaken(email,0),409,"Email already exists");
        text(input.password(),72,"password"); String password=input.password();
        require(password.length()>=12&&password.getBytes(StandardCharsets.UTF_8).length<=72,400,"Password must be 12 to 72 UTF-8 bytes");
        long id=db.createAccount(text(input.firstName(),45,"first name"),text(input.lastName(),45,"last name"),email,passwords.encode(password),role,status);
        if(role==2) {
            require(input.organizationId()!=null&&db.organization(input.organizationId()),400,"Coordinator organization required");
            db.grantCoordinator((int)id,input.organizationId(),text(input.position(),45,"position"));
        }
        db.audit(actor,"CREATE_ACCOUNT","ACCOUNT",id,reason); db.email(email,"GoEvent account created","An administrator created your account. Contact support for secure access instructions.");
        return id;
    }
    @Transactional public void edit(int actor,int id,Account input) {
        lockAdmin(actor); var old=account(id); String reason=text(input.reason(),1000,"reason");
        int role=Objects.requireNonNullElse(input.roleId(),number(old,"role_id"));
        int status=Objects.requireNonNullElse(input.statusId(),number(old,"user_status_id"));
        require(Set.of(1,2,3,4,5).contains(role)&&Set.of(1,2,3).contains(status),400,"Invalid role/status");
        require(input.password()==null,400,"Password changes are not part of account editing");
        protectAdmin(actor,id,old,role,status);
        String email=email(input.email()); require(!db.emailTaken(email,id),409,"Email already exists");
        db.editAccount(id,text(input.firstName(),45,"first name"),text(input.lastName(),45,"last name"),email,role,status,reason);
        if(role==2 && (number(old,"role_id")!=2 || input.organizationId()!=null)) {
            require(input.organizationId()!=null&&db.organization(input.organizationId()),400,"Coordinator organization required");
            db.grantCoordinator(id,input.organizationId(),text(input.position(),45,"position"));
        }
        db.audit(actor,"EDIT_ACCOUNT","ACCOUNT",id,reason);
        db.email(old.get("email").toString(),"GoEvent account updated",reason);
    }
    private void protectAdmin(int actor,int id,Map<String,Object> old,int role,int status) {
        require(actor!=id || (role==3&&status==1),409,"Cannot disable or demote yourself");
        if(number(old,"role_id")==3&&number(old,"user_status_id")==1&&(role!=3||status!=1))
            require(db.activeAdmins()>1,409,"Cannot remove the last active admin");
    }
    @Transactional public void access(int actor,int id,boolean enable,String reason) {
        lockAdmin(actor); var old=account(id); reason=text(reason,1000,"reason");
        protectAdmin(actor,id,old,number(old,"role_id"),enable?1:2);
        db.editAccount(id,old.get("fname").toString(),old.get("lname").toString(),old.get("email").toString(),number(old,"role_id"),enable?1:2,reason);
        db.audit(actor,enable?"ENABLE_ACCOUNT":"DISABLE_ACCOUNT","ACCOUNT",id,reason);
        db.email(old.get("email").toString(),"GoEvent access changed",reason);
    }
    @Transactional public void delete(int actor,int id,String reason) {
        lockAdmin(actor); var old=account(id); reason=text(reason,1000,"reason");
        protectAdmin(actor,id,old,1,2); require(!db.referencedUser(id),409,"Linked records exist; disable this account instead");
        try { db.deleteAccount(id); } catch(DataIntegrityViolationException error) { throw new ResponseStatusException(HttpStatus.CONFLICT,"Linked records exist; disable instead"); }
        db.audit(actor,"DELETE_ACCOUNT","ACCOUNT",id,reason); db.email(old.get("email").toString(),"GoEvent account deleted",reason);
    }
    @Transactional public long requestCoordinator(int user,Coordinator input) {
        db.lock(); require(db.active(user),403,"Active user required"); var current=account(user);
        require(Set.of(1,4).contains(number(current,"role_id")),409,"Only ordinary users/students may request coordinator access");
        require(db.organization(input.organizationId()),400,"Unknown organization");
        String position=text(input.position(),45,"position"), message=text(input.message(),200,"message");
        try { return db.requestCoordinator(user,input.organizationId(),position,message); }
        catch(DataIntegrityViolationException error) { throw new ResponseStatusException(HttpStatus.CONFLICT,"A pending request already exists"); }
    }
    public List<Map<String,Object>> ownRequests(int user) { require(db.active(user),403,"Active user required"); return db.ownRequests(user); }
    public List<Map<String,Object>> requests(Integer status,int limit,int offset) {
        require(status==null||Set.of(1,2,3).contains(status),400,"Invalid request status"); return db.coordinators(status,limit,offset);
    }
    @Transactional public void decideRequest(int actor,long id,Decision input) {
        lockAdmin(actor); var row=db.coordinator(id); require(row!=null,404,"Request not found");
        require(number(row,"status_id")==1,409,"Request already reviewed"); String reason=text(input.reason(),1000,"reason");
        int target=number(row,"user_id"); require(target!=actor,409,"Cannot approve your own request");
        var user=account(target); require(number(user,"user_status_id")==1,409,"Applicant is not active");
        require(Set.of(1,4).contains(number(user,"role_id")),409,"Applicant role changed");
        if(input.approve()) { require(row.get("organization_id")!=null,409,"Request needs organization details"); db.grantCoordinator(target,number(row,"organization_id"),text((String)row.get("position"),45,"position")); }
        db.decideCoordinator(id,actor,input.approve(),reason); db.audit(actor,input.approve()?"APPROVE_COORDINATOR":"REJECT_COORDINATOR","REQUEST",id,reason);
        db.email(row.get("email").toString(),"GoEvent coordinator request "+(input.approve()?"approved":"rejected"),reason);
    }
    @Transactional public void revoke(int actor,int id,String reason) {
        lockAdmin(actor); var old=account(id); require(number(old,"role_id")==2,409,"Account is not a coordinator");
        reason=text(reason,1000,"reason"); db.revokeCoordinator(id); db.audit(actor,"REVOKE_COORDINATOR","ACCOUNT",id,reason);
        db.email(old.get("email").toString(),"GoEvent coordinator access removed",reason);
    }
    public List<Map<String,Object>> events(Integer status,String phase,int limit,int offset) {
        require(status==null||Set.of(1,2,3,4).contains(status),400,"Invalid review state");
        require(Set.of("ALL","UPCOMING","ONGOING","COMPLETED","UNKNOWN").contains(phase),400,"Invalid schedule filter");
        return db.events(status,phase,limit,offset);
    }
    public Map<String,Object> event(int id) { var row=db.event(id); require(row!=null,404,"Event not found"); return row; }
    private Map<String,Object> eventForUpdate(int actor,int id,int revision) {
        lockAdmin(actor); var row=event(id); require(number(row,"revision")==revision,409,"Event changed; refresh first");
        require(row.get("disabled_at")==null,409,"Event is disabled"); return row;
    }
    @Transactional public void decideEvent(int actor,int id,EventDecision input) {
        var row=eventForUpdate(actor,id,input.revision()); require(number(row,"event_status_id")==1,409,"Only pending events can be reviewed");
        if(input.approve()) {
            var publisher=account(number(row,"published_by"));
            require(number(publisher,"user_status_id")==1&&Set.of(2,3).contains(number(publisher,"role_id")),409,"Event publisher must have active coordinator access");
        }
        String reason=text(input.reason(),1000,"reason"); db.decideEvent(id,actor,input.approve(),reason);
        db.audit(actor,input.approve()?"APPROVE_EVENT":"REJECT_EVENT","EVENT",id,reason); db.email(row.get("coordinator_email").toString(),"GoEvent event review",reason);
    }
    @Transactional public void editEvent(int actor,int id,EventEdit input) {
        var row=eventForUpdate(actor,id,input.revision()); require(input.startsAt()!=null&&input.endsAt()!=null&&input.endsAt().isAfter(input.startsAt()),400,"Valid start/end instants required");
        String reason=text(input.reason(),1000,"reason"); require(input.description()==null||input.description().length()<=20000,400,"Description too long");
        db.editEvent(id,text(input.name(),100,"name"),input.description(),input.startsAt(),input.endsAt(),reason);
        db.audit(actor,"EDIT_EVENT","EVENT",id,reason); db.email(row.get("coordinator_email").toString(),"GoEvent event updated",reason);
    }
    @Transactional public void disableEvent(int actor,int id,String reason) {
        lockAdmin(actor); var row=event(id); require(row.get("disabled_at")==null,409,"Event already disabled");
        reason=text(reason,1000,"reason"); db.disableEvent(id,reason); db.audit(actor,"DISABLE_EVENT","EVENT",id,reason); db.email(row.get("coordinator_email").toString(),"GoEvent event disabled",reason);
    }
    @Transactional public void deleteEvent(int actor,int id,String reason) {
        lockAdmin(actor); var row=event(id); reason=text(reason,1000,"reason");
        require(!db.referencedEvent(id),409,"Event has linked records; disable it instead");
        try { db.deleteEvent(id); } catch(DataIntegrityViolationException error) { throw new ResponseStatusException(HttpStatus.CONFLICT,"Event has linked records; disable instead"); }
        db.audit(actor,"DELETE_EVENT","EVENT",id,reason); db.email(row.get("coordinator_email").toString(),"GoEvent event deleted",reason);
    }
    @Transactional public long contact(Contact input) {
        String email=text(input.email(),254,"email").toLowerCase(Locale.ROOT);
        require(email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"),400,"Invalid email");
        return db.createContact(email,text(input.subject(),200,"subject"),text(input.message(),10000,"message"));
    }
    public List<Map<String,Object>> contacts(int limit,int offset) { return db.contacts(limit,offset); }
    public Map<String,Object> contact(long id) { var row=db.contact(id); require(row!=null,404,"Message not found"); return row; }
    @Transactional public void reply(int actor,long id,String body) {
        lockAdmin(actor); var row=contact(id); require(row.get("replied_at")==null,409,"Message already replied to");
        body=text(body,10000,"reply"); db.reply(id,actor,body);
        String subject="Re: "+row.get("subject");
        db.email(row.get("email").toString(),subject.substring(0,Math.min(200,subject.length())),body);
        db.audit(actor,"REPLY_CONTACT","CONTACT",id,"Reply queued");
    }
    public List<Map<String,Object>> audit(int limit,int offset) { return db.audits(limit,offset); }
    public List<Map<String,Object>> emails(int limit,int offset) { return db.emails(limit,offset); }
    @Transactional public void retryEmail(int actor,long id,String reason) {
        lockAdmin(actor); reason=text(reason,1000,"reason");
        require(db.retryEmail(id),409,"Only failed notifications can be retried");
        db.audit(actor,"RETRY_EMAIL","EMAIL",id,reason);
    }
}
