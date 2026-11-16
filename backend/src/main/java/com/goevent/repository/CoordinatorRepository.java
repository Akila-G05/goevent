package com.goevent.repository;

import org.springframework.stereotype.Repository;
import java.util.*;

/** Coordinator SQL uses the existing schema and shared JDBC helper. */
@Repository
public class CoordinatorRepository {
    private static final String EVENT_PHASE="""
CASE WHEN e.disabled_at IS NOT NULL THEN 'CANCELLED'
              WHEN e.published_revision_id IS NULL AND e.event_status_id<>2 THEN
                CASE COALESCE(r.review_state,CASE e.event_status_id WHEN 1 THEN 'PENDING' WHEN 3 THEN 'REJECTED' ELSE 'DRAFT' END) WHEN 'PENDING' THEN 'PENDING' WHEN 'REJECTED' THEN 'REJECTED' ELSE 'DRAFT' END
              WHEN e.starts_at IS NULL THEN 'UNKNOWN' WHEN e.starts_at>UTC_TIMESTAMP(6) THEN 'UPCOMING'
              WHEN e.ends_at>UTC_TIMESTAMP(6) THEN 'ONGOING' ELSE 'COMPLETED' END
        """;
    private final AdminRepository db;
    public CoordinatorRepository(AdminRepository db) { this.db=db; }
    public boolean member(int user,int org) {
        return db.count("SELECT COUNT(*) FROM user_has_organize m JOIN `user` u ON u.id=m.user_id WHERE m.user_id=? AND m.organization_id=? AND m.access_state='APPROVED' AND u.user_status_id=1",user,org)==1;
    }
    public List<Map<String,Object>> workspaces(int user) {
        return db.rows("SELECT m.id,m.organization_id,o.name,m.position,m.access_state FROM user_has_organize m JOIN organization o ON o.id=m.organization_id WHERE m.user_id=? AND m.access_state='APPROVED' ORDER BY o.name",user);
    }
    public Map<String,Object> event(int id) { return db.one("SELECT * FROM `event` WHERE id=?",id); }
    public Map<String,Object> revision(long id) { return db.one("SELECT * FROM event_revision WHERE id=?",id); }
    public List<Map<String,Object>> events(int user,int org,String phase,java.time.LocalDateTime from,java.time.LocalDateTime to,int size,int offset) {
        return db.rows("""
            SELECT e.id,CASE WHEN e.published_revision_id IS NULL AND e.event_status_id<>2 THEN COALESCE(JSON_UNQUOTE(JSON_EXTRACT(r.content,'$.name')),e.name) ELSE e.name END AS name,e.revision,e.event_status_id,e.disabled_at,e.starts_at,e.ends_at,
              e.working_revision_id,e.published_revision_id,r.review_state,r.reason,
              JSON_UNQUOTE(JSON_EXTRACT(p.content,'$.timezone')) AS timezone,
              %s AS phase
            FROM `event` e LEFT JOIN event_revision r ON r.id=e.working_revision_id LEFT JOIN event_revision p ON p.id=e.published_revision_id
            WHERE e.published_by=? AND e.organization_id=?
              AND (? IS NULL OR e.starts_at IS NULL OR e.starts_at>=?) AND (? IS NULL OR e.starts_at IS NULL OR e.starts_at<?)
            HAVING (?='ALL' OR phase=?) ORDER BY e.id DESC LIMIT ? OFFSET ?
            """.formatted(EVENT_PHASE),user,org,from,from,to,to,phase,phase,size,offset);
    }
    public List<Map<String,Object>> attendees(int event,int after,int size) {
        return db.rows("SELECT b.id AS booking_id,b.booking_reference,b.created_at,u.id AS user_id,u.fname,u.lname,u.email FROM booking b JOIN `user` u ON u.id=b.user_id WHERE b.event_id=? AND b.id>? ORDER BY b.id LIMIT ?",event,after,size);
    }
    public long notice(int event,Integer org,int actor,String subject,String body,String timezone) {
        return db.insert("INSERT INTO participant_campaign(event_id,organization_id,created_by,subject,body,scheduled_at,event_timezone,system_notice,created_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6),?,TRUE,UTC_TIMESTAMP(6))",event,org,actor,subject,body,timezone);
    }
    public Map<String,Object> statistics(int user,int org,java.time.LocalDateTime from,java.time.LocalDateTime to,Integer eventId) {
        String ownership="e.published_by=? AND e.organization_id=? AND (? IS NULL OR e.id=?)";
        var result=new LinkedHashMap<String,Object>();
        result.put("selectedEventId",eventId);
        result.put("events",db.count("SELECT COUNT(*) FROM `event` e WHERE "+ownership,user,org,eventId,eventId));
        result.put("eventStates",db.rows("SELECT "+EVENT_PHASE+" AS phase,COUNT(*) AS count FROM `event` e LEFT JOIN event_revision r ON r.id=e.working_revision_id WHERE "+ownership+" GROUP BY phase ORDER BY phase",user,org,eventId,eventId));
        result.put("bookings",db.count("SELECT COUNT(*) FROM booking b JOIN `event` e ON e.id=b.event_id WHERE "+ownership+" AND b.created_at>=? AND b.created_at<?",user,org,eventId,eventId,from,to));
        result.put("impressions",db.one("SELECT SUM(i.impressions) AS measured FROM event_impression_count i JOIN `event` e ON e.id=i.event_id WHERE "+ownership+" AND i.measured_at>=? AND i.measured_at<?",user,org,eventId,eventId,from,to));
        result.put("ticketQuantities",db.one("""
            SELECT CAST(SUM(CASE WHEN bi.qty REGEXP '^[0-9]{1,9}$' THEN CAST(bi.qty AS UNSIGNED) ELSE NULL END) AS CHAR) AS booked_quantity,
              COALESCE(SUM(CASE WHEN bi.qty REGEXP '^[0-9]{1,9}$' THEN 0 ELSE 1 END),0) AS invalid_quantities
            FROM booking_item bi JOIN booking b ON b.id=bi.booking_id JOIN `event` e ON e.id=b.event_id WHERE
            """+ownership+" AND b.created_at>=? AND b.created_at<?",user,org,eventId,eventId,from,to));
        result.put("packages",db.rows("""
            SELECT bi.ticket_id,t.description AS package_name,
              SUM(CASE WHEN bi.qty REGEXP '^[0-9]{1,9}$' THEN CAST(bi.qty AS UNSIGNED) ELSE NULL END) AS booked_quantity,
              SUM(CASE WHEN bi.qty REGEXP '^[0-9]{1,9}$' THEN 0 ELSE 1 END) AS invalid_quantities,
              CAST(SUM(CASE WHEN bi.unit_price REGEXP '^[0-9]{1,18}([.][0-9]{1,4})?$' AND bi.qty REGEXP '^[0-9]{1,9}$'
                THEN CAST(bi.unit_price AS DECIMAL(24,4))*CAST(bi.qty AS UNSIGNED) ELSE NULL END) AS CHAR) AS recorded_booking_amount
            FROM booking_item bi JOIN ticket t ON t.id=bi.ticket_id JOIN booking b ON b.id=bi.booking_id
            JOIN `event` e ON e.id=b.event_id WHERE
            """+ownership+" AND b.created_at>=? AND b.created_at<? GROUP BY bi.ticket_id,t.description",user,org,eventId,eventId,from,to));
        result.put("payments",db.rows("""
            SELECT COALESCE(p.currency,'UNKNOWN') AS currency,
              CAST(SUM(CASE WHEN p.p_status_id=2 AND p.amount REGEXP '^[0-9]{1,18}([.][0-9]{1,4})?$' THEN CAST(p.amount AS DECIMAL(24,4)) ELSE NULL END) AS CHAR) AS paid_amount,
              CAST(SUM(CASE WHEN p.p_status_id=5 AND p.amount REGEXP '^[0-9]{1,18}([.][0-9]{1,4})?$' THEN CAST(p.amount AS DECIMAL(24,4)) ELSE NULL END) AS CHAR) AS refunded_state_amount,
              NULL AS net_recorded_amount,
              SUM(CASE WHEN p.amount REGEXP '^[0-9]{1,18}([.][0-9]{1,4})?$' THEN 0 ELSE 1 END) AS invalid_amounts
            FROM payment p JOIN booking b ON b.id=p.booking_id JOIN `event` e ON e.id=b.event_id WHERE
            """+ownership+" AND p.created_at>=? AND p.created_at<? GROUP BY p.currency ORDER BY p.currency",user,org,eventId,eventId,from,to));
        result.put("unavailableHistory",db.one("SELECT COUNT(*) AS bookings_without_time FROM booking b JOIN `event` e ON e.id=b.event_id WHERE "+ownership+" AND b.created_at IS NULL",user,org,eventId,eventId));
        result.put("notice","Event statuses are current snapshots; bookings, tickets, views and payment records use the selected UTC date range. Impressions start at rollout. Bookings are not paid sales. Payment states are not a refund ledger; net recorded amounts and historical impressions are unavailable. Package amounts are recorded bookings with unknown currency, not allocated payment revenue. Checkout and QR enforcement are separate work.");
        return result;
    }
    public List<Map<String,Object>> categories() { return db.rows("SELECT id,name FROM category ORDER BY name"); }
    public List<Map<String,Object>> organizations() { return db.rows("SELECT id,name FROM organization ORDER BY name"); }
    public List<Map<String,Object>> organizationTypes() { return db.rows("SELECT id,type FROM org_type ORDER BY type"); }
    public List<Map<String,Object>> universities() { return db.rows("SELECT id,name FROM university ORDER BY name"); }
    public List<Map<String,Object>> applications(int user,int size,int offset) { return db.rows("SELECT id,organization_id,proposed_name,position,status_id,created_at,reviewed_at,decision_reason,revoked_at,proof_id FROM `request` WHERE user_id=? AND role_id=2 ORDER BY id DESC LIMIT ? OFFSET ?",user,size,offset); }
    public long organizationTypeCount(int id) { return db.count("SELECT COUNT(*) FROM org_type WHERE id=?",id); }
    public long createApplication(int user,Integer org,String proposedName,Integer type,String position,String email,String phone,String explanation,String message,Long proof) { return db.insert("""
                INSERT INTO `request`(user_id,role_id,status_id,aproved_by,organization_id,proposed_name,proposed_type_id,
                position,contact_email,contact_phone,explanation,msg,proof_id,created_at)
                VALUES(?,2,1,NULL,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))
                """,user,org,proposedName,type,position,email,phone,explanation,message,proof); }
    public long createOrganization(String name,int type) { return db.insert("INSERT INTO organization(name,org_type_id) VALUES(?,?)",name,type); }
    public long pendingApplications(int user,int org,long except) { return db.count("SELECT COUNT(*) FROM `request` WHERE user_id=? AND organization_id=? AND role_id=2 AND status_id=1 AND id<>?",user,org,except); }
    public int linkApplication(int org,long id) { return db.update("UPDATE `request` SET organization_id=? WHERE id=?",org,id); }
    public int recordMembershipDecision(int actor,String reason,int user,int org) { return db.update("UPDATE user_has_organize SET decided_by=?,decided_at=UTC_TIMESTAMP(6),decision_reason=? WHERE user_id=? AND organization_id=? AND access_state='APPROVED'",actor,reason,user,org); }
    public Map<String,Object> membership(long id) { return db.one("SELECT * FROM user_has_organize WHERE id=?",id); }
    public int revokeMembership(int actor,String reason,long membership) { return db.update("UPDATE user_has_organize SET access_state='REVOKED',decided_by=?,decided_at=UTC_TIMESTAMP(6),decision_reason=? WHERE id=?",actor,reason,membership); }
    public int revokeApprovedApplications(int user,int org) { return db.update("UPDATE `request` SET revoked_at=UTC_TIMESTAMP(6) WHERE user_id=? AND organization_id=? AND status_id=2 AND revoked_at IS NULL",user,org); }
    public List<Map<String,Object>> memberships(int user) { return db.rows("SELECT m.*,o.name FROM user_has_organize m JOIN organization o ON o.id=m.organization_id WHERE user_id=? ORDER BY id DESC LIMIT 100",user); }
    public long storeDocument(int user,String purpose,String type,int size,String hash,byte[] bytes) { return db.insert("INSERT INTO private_document(owner_id,purpose,media_type,byte_size,sha256,content,created_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",user,purpose,type,size,hash,bytes); }
    public long ownedDocumentCount(long id,int user,String purpose) { return db.count("SELECT COUNT(*) FROM private_document WHERE id=? AND owner_id=? AND purpose=?",id,user,purpose); }
    public Map<String,Object> document(long id) { return db.one("SELECT owner_id,media_type,content FROM private_document WHERE id=?",id); }
    public long categoryCount(int id) { return db.count("SELECT COUNT(*) FROM category WHERE id=?",id); }
    public long universityCount(int id) { return db.count("SELECT COUNT(*) FROM university WHERE id=?",id); }
    public long createVenue(String name,String address,String city) { return db.insert("INSERT INTO venue(name,address,city) VALUES(?,?,?)",name,address,city); }
    public long createImage(String path,String banner) { return db.insert("INSERT INTO img(path,bannerpath) VALUES(?,?)",path,banner); }
    public long createVideoLink(String url) { return db.insert("INSERT INTO link(link_name,link) VALUES('Video',?)",url); }
    public long createDraft(String name,String description,int category,long venue,int audience,int level,long image,long link,int user,int org) { return db.insert("INSERT INTO `event`(name,description,category_id,venue_id,event_status_id,audience_id,event_level_id,img_id,link_id,published_by,organization_id,aproved_by) VALUES(?,?,?,?,4,?,?,?,?,?,?,NULL)",name,description,category,venue,audience,level,image,link,user,org); }
    public long createRevision(int event,int version,String content,int user) { return db.insert("INSERT INTO event_revision(event_id,version,content,created_by,created_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6))",event,version,content,user); }
    public int setWorkingRevision(long revision,int version,int event) { return db.update("UPDATE `event` SET working_revision_id=?,revision=? WHERE id=?",revision,version,event); }
    public int submitRevision(long id) { return db.update("UPDATE event_revision SET review_state='PENDING',submitted_at=UTC_TIMESTAMP(6) WHERE id=?",id); }
    public int markSubmitted(int id) { return db.update("UPDATE `event` SET revision=revision+1,event_status_id=CASE WHEN published_revision_id IS NULL AND event_status_id<>2 THEN 1 ELSE event_status_id END WHERE id=?",id); }
    public int publish(String name,String description,int category,int audience,int level,java.time.LocalDateTime start,java.time.LocalDateTime end,long revision,int actor,int id) { return db.update("UPDATE `event` SET name=?,description=?,category_id=?,audience_id=?,event_level_id=?,starts_at=?,ends_at=?,published_revision_id=?,event_status_id=2,aproved_by=? WHERE id=?",name,description,category,audience,level,start,end,revision,actor,id); }
    public int setPublishedAssets(long venue,long image,long link,int id) { return db.update("UPDATE `event` SET venue_id=?,img_id=?,link_id=? WHERE id=?",venue,image,link,id); }
    public int reviewRevision(String state,int actor,String reason,long revision) { return db.update("UPDATE event_revision SET review_state=?,reviewed_by=?,reviewed_at=UTC_TIMESTAMP(6),reason=? WHERE id=?",state,actor,reason,revision); }
    public int finishReview(String reason,int state,int id) { return db.update("UPDATE `event` SET revision=revision+1,moderation_reason=?,event_status_id=CASE WHEN published_revision_id IS NULL AND event_status_id<>2 THEN ? ELSE event_status_id END WHERE id=?",reason,state,id); }
    public int assignOrganization(int org,int id) { return db.update("UPDATE `event` SET organization_id=?,revision=revision+1 WHERE id=?",org,id); }
    public long submittedHistoryCount(int id) { return db.count("SELECT COUNT(*) FROM event_revision WHERE event_id=? AND review_state<>'DRAFT'",id); }
    public int deleteDraftRevisions(int id) { return db.update("DELETE FROM event_revision WHERE event_id=?",id); }
    public int cancelUnstartedCampaigns(int id) { return db.update("UPDATE participant_campaign SET campaign_state='CANCELLED' WHERE event_id=? AND system_notice=FALSE AND campaign_state='SCHEDULED'",id); }
    public long bookingCount(int id) { return db.count("SELECT COUNT(*) FROM booking WHERE event_id=?",id); }
    public long createCampaign(int event,int org,int user,String subject,String body,java.time.LocalDateTime at,String timezone) { return db.insert("INSERT INTO participant_campaign(event_id,organization_id,created_by,subject,body,scheduled_at,event_timezone,created_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",event,org,user,subject,body,at,timezone); }
    public List<Map<String,Object>> campaigns(int event,int size,int offset) { return db.rows("SELECT c.id,c.subject,c.scheduled_at,c.event_timezone,c.campaign_state,c.system_notice,o.status,COUNT(o.id) AS recipients FROM participant_campaign c LEFT JOIN admin_email_outbox o ON o.campaign_id=c.id WHERE c.event_id=? GROUP BY c.id,o.status ORDER BY c.id DESC,o.status LIMIT ? OFFSET ?",event,size,offset); }
    public int cancelCampaign(long id,int event) { return db.update("UPDATE participant_campaign SET campaign_state='CANCELLED' WHERE id=? AND event_id=? AND system_notice=FALSE AND campaign_state='SCHEDULED'",id,event); }

    public List<Map<String,Object>> publicEvents(int size,int offset) { return db.rows("SELECT e.id,e.name,e.description,e.starts_at,e.ends_at,i.path,i.bannerpath,e.published_revision_id FROM `event` e JOIN img i ON i.id=e.img_id WHERE e.event_status_id=2 AND e.disabled_at IS NULL ORDER BY e.starts_at,e.id LIMIT ? OFFSET ?",size,offset); }
    public Map<String,Object> publicEvent(int id) { return db.one("SELECT e.id,e.name,e.description,e.starts_at,e.ends_at,r.content FROM `event` e LEFT JOIN event_revision r ON r.id=e.published_revision_id WHERE e.id=? AND e.event_status_id=2 AND e.disabled_at IS NULL",id); }
    public void ensureImpression(int id,String hash) { db.update("INSERT IGNORE INTO event_impression(event_id,session_hash,last_seen_at) VALUES(?,?,'1970-01-01 00:00:00')",id,hash); }
    public int recordImpression(int id,String hash) { return db.update("UPDATE event_impression SET last_seen_at=UTC_TIMESTAMP(6) WHERE event_id=? AND session_hash=? AND last_seen_at<UTC_TIMESTAMP(6)-INTERVAL 30 MINUTE",id,hash); }
    public void incrementImpressions(int id) { db.update("INSERT INTO event_impression_count(event_id,measured_at,impressions) VALUES(?,UTC_TIMESTAMP(6),1) ON DUPLICATE KEY UPDATE impressions=impressions+1",id); }
}
