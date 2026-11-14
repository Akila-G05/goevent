package com.goevent.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

/** SQL stays in the repository; table/column identifiers below are internal constants. */
@Repository
public class AdminRepository {
    private final JdbcTemplate jdbc;
    public AdminRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public void lock() { jdbc.queryForObject("SELECT id FROM admin_mutex WHERE id=1 FOR UPDATE", Integer.class); }
    public List<Map<String,Object>> rows(String sql, Object... args) { return jdbc.queryForList(sql,args); }
    public Map<String,Object> one(String sql,Object... args) {
        var rows=rows(sql,args); return rows.isEmpty()?null:rows.getFirst();
    }
    public int update(String sql,Object... args) { return jdbc.update(sql,args); }
    public long count(String sql,Object... args) { return Objects.requireNonNull(jdbc.queryForObject(sql,Long.class,args)); }
    public long insert(String sql,Object... args) {
        var key=new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement=connection.prepareStatement(sql,Statement.RETURN_GENERATED_KEYS);
            for(int i=0;i<args.length;i++) statement.setObject(i+1,args[i]);
            return statement;
        },key);
        return Objects.requireNonNull(key.getKey()).longValue();
    }
    public void audit(int actor,String action,String type,long target,String reason) {
        update("INSERT INTO admin_audit(actor_id,action,target_type,target_id,reason,created_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))",
            actor,action,type,target,reason);
    }
    public void email(String recipient,String subject,String body) {
        update("INSERT INTO admin_email_outbox(recipient,subject,body,available_at,created_at) VALUES(?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",
            recipient,subject,body);
    }
    public boolean active(int user) { return count("SELECT COUNT(*) FROM `user` WHERE id=? AND user_status_id=1",user)==1; }
    public boolean admin(int user) { return count("SELECT COUNT(*) FROM `user` WHERE id=? AND role_id=3 AND user_status_id=1",user)==1; }
    public boolean referencedUser(int id) {
        return referenced("user",id);
    }
    public boolean referencedEvent(int id) { return referenced("event",id); }
    private boolean referenced(String target,int id) {
        // Discover every FK, including legacy and future tables. Identifiers originate
        // exclusively from MySQL metadata and are quoted, never supplied by callers.
        for(var fk:rows("SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME=?",target)) {
            String table=fk.get("TABLE_NAME").toString().replace("`","``");
            String column=fk.get("COLUMN_NAME").toString().replace("`","``");
            if(count("SELECT COUNT(*) FROM `"+table+"` WHERE `"+column+"`=?",id)>0) return true;
        }
        return false;
    }
    private static final String ACCOUNT="id,fname,lname,email,registered_date,user_status_id,role_id,mobile,disabled_reason";
    public Map<String,Object> account(int id) { return one("SELECT "+ACCOUNT+" FROM `user` WHERE id=?",id); }
    public List<Map<String,Object>> accounts(Integer role,Integer status,String search,int limit,int offset) {
        return rows("SELECT "+ACCOUNT+" FROM `user` WHERE (? IS NULL OR role_id=?) AND (? IS NULL OR user_status_id=?) AND (email LIKE ? OR fname LIKE ? OR lname LIKE ?) ORDER BY id LIMIT ? OFFSET ?",
            role,role,status,status,"%"+search+"%","%"+search+"%","%"+search+"%",limit,offset);
    }
    public boolean emailTaken(String email,int except) { return count("SELECT COUNT(*) FROM `user` WHERE LOWER(email)=? AND id<>?",email,except)>0; }
    public long createAccount(String first,String last,String email,String hash,int role,int status) {
        return insert("INSERT INTO `user`(fname,lname,email,password,registered_date,user_status_id,role_id,auth_type_id) VALUES(?,?,?,?,UTC_TIMESTAMP(),?,?,2)",first,last,email,hash,status,role);
    }
    public void editAccount(int id,String first,String last,String email,int role,int status,String reason) {
        update("UPDATE `user` SET coordinator_previous_role_id=CASE WHEN ?=2 AND role_id IN (1,4) THEN role_id WHEN ?<>2 THEN NULL ELSE coordinator_previous_role_id END,fname=?,lname=?,email=?,role_id=?,user_status_id=?,disabled_reason=? WHERE id=?",role,role,first,last,email,role,status,status==2?reason:null,id);
    }
    public long activeAdmins() { return count("SELECT COUNT(*) FROM `user` WHERE role_id=3 AND user_status_id=1"); }
    public void deleteAccount(int id) { update("DELETE FROM `user` WHERE id=?",id); }
    public boolean organization(int id) { return count("SELECT COUNT(*) FROM organization WHERE id=?",id)==1; }
    public Map<String,Object> coordinator(long id) { return one("SELECT r.*,u.email FROM `request` r JOIN `user` u ON u.id=r.user_id WHERE r.id=? AND r.role_id=2",id); }
    public List<Map<String,Object>> coordinators(Integer status,int limit,int offset) {
        return rows("SELECT r.id,r.user_id,r.msg,r.organization_id,r.position,r.status_id,r.created_at,r.reviewed_at,r.decision_reason,u.email FROM `request` r JOIN `user` u ON u.id=r.user_id WHERE r.role_id=2 AND (? IS NULL OR r.status_id=?) ORDER BY r.id DESC LIMIT ? OFFSET ?",status,status,limit,offset);
    }
    public List<Map<String,Object>> ownRequests(int user) { return rows("SELECT id,msg,status_id,organization_id,position,created_at,reviewed_at,decision_reason FROM `request` WHERE user_id=? AND role_id=2 ORDER BY id DESC LIMIT 100",user); }
    public long requestCoordinator(int user,int org,String position,String message) {
        return insert("INSERT INTO `request`(user_id,role_id,status_id,aproved_by,organization_id,position,msg,created_at) VALUES(?,2,1,NULL,?,?,?,UTC_TIMESTAMP(6))",user,org,position,message);
    }
    public void decideCoordinator(long id,int actor,boolean approve,String reason) {
        update("UPDATE `request` SET status_id=?,aproved_by=?,reviewed_at=UTC_TIMESTAMP(6),decision_reason=? WHERE id=?",approve?2:3,actor,reason,id);
    }
    public void grantCoordinator(int user,int org,String position) {
        update("UPDATE `user` SET coordinator_previous_role_id=CASE WHEN role_id IN (1,4) THEN role_id ELSE coordinator_previous_role_id END,role_id=2 WHERE id=?",user);
        // Append the approved assignment rather than overwriting prior organizations.
        update("INSERT INTO user_has_organize(user_id,organization_id,position,registered_date) VALUES(?,?,?,UTC_TIMESTAMP())",user,org,position);
    }
    public void revokeCoordinator(int id) { update("UPDATE `user` SET role_id=COALESCE(coordinator_previous_role_id,1),coordinator_previous_role_id=NULL WHERE id=? AND role_id=2",id); }
    public Map<String,Object> event(int id) { return one("SELECT e.*,u.email AS coordinator_email FROM `event` e JOIN `user` u ON u.id=e.published_by WHERE e.id=?",id); }
    public List<Map<String,Object>> events(Integer status,String phase,int limit,int offset) {
        String phaseSql=switch(phase) {
            case "UPCOMING" -> " AND starts_at>UTC_TIMESTAMP(6)";
            case "ONGOING" -> " AND starts_at<=UTC_TIMESTAMP(6) AND ends_at>UTC_TIMESTAMP(6)";
            case "COMPLETED" -> " AND ends_at<=UTC_TIMESTAMP(6)";
            case "UNKNOWN" -> " AND starts_at IS NULL";
            default -> "";
        };
        return rows("SELECT * FROM `event` WHERE (? IS NULL OR event_status_id=?)"+phaseSql+" ORDER BY id DESC LIMIT ? OFFSET ?",status,status,limit,offset);
    }
    public void decideEvent(int id,int actor,boolean approve,String reason) {
        update("UPDATE `event` SET event_status_id=?,aproved_by=?,moderation_reason=?,revision=revision+1 WHERE id=?",approve?2:3,actor,reason,id);
    }
    public void editEvent(int id,String name,String description,Instant start,Instant end,String reason) {
        update("UPDATE `event` SET name=?,description=?,starts_at=?,ends_at=?,moderation_reason=?,revision=revision+1 WHERE id=?",name,description,Timestamp.from(start),Timestamp.from(end),reason,id);
    }
    public void disableEvent(int id,String reason) { update("UPDATE `event` SET disabled_at=UTC_TIMESTAMP(6),moderation_reason=?,revision=revision+1 WHERE id=?",reason,id); }
    public void deleteEvent(int id) { update("DELETE FROM `event` WHERE id=?",id); }
    public List<Map<String,Object>> contacts(int limit,int offset) { return rows("SELECT id,email,subject,created_at,replied_at,replied_by FROM contact_message ORDER BY id DESC LIMIT ? OFFSET ?",limit,offset); }
    public Map<String,Object> contact(long id) { return one("SELECT * FROM contact_message WHERE id=?",id); }
    public long createContact(String email,String subject,String message) { return insert("INSERT INTO contact_message(email,subject,body,created_at) VALUES(?,?,?,UTC_TIMESTAMP(6))",email,subject,message); }
    public void reply(long id,int actor,String message) { update("UPDATE contact_message SET replied_at=UTC_TIMESTAMP(6),replied_by=?,reply_body=? WHERE id=?",actor,message,id); }
    public List<Map<String,Object>> audits(int limit,int offset) { return rows("SELECT * FROM admin_audit ORDER BY id DESC LIMIT ? OFFSET ?",limit,offset); }
    public List<Map<String,Object>> emails(int limit,int offset) { return rows("SELECT id,status,attempts,available_at,leased_at,provider_operation_id,created_at FROM admin_email_outbox ORDER BY id DESC LIMIT ? OFFSET ?",limit,offset); }
    public boolean retryEmail(long id) { return update("UPDATE admin_email_outbox SET status='QUEUED',attempts=0,leased_at=NULL,available_at=UTC_TIMESTAMP(6) WHERE id=? AND status='FAILED'",id)==1; }
}
