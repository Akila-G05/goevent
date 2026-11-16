package com.goevent.repository;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/** Bounded recipient expansion; locks and outbox insertion commit together. */
@Repository
public class ParticipantCampaignRepository {
    private final AdminRepository db;
    public ParticipantCampaignRepository(AdminRepository db) { this.db=db; }
    @Transactional public void enqueueBatch() {
        db.lock();
        var row=db.one("SELECT * FROM participant_campaign WHERE campaign_state IN ('SCHEDULED','DISPATCHING') AND scheduled_at<=UTC_TIMESTAMP(6) ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED");
        if(row==null)return;
        long id=((Number)row.get("id")).longValue();
        boolean notice=Boolean.TRUE.equals(row.get("system_notice"));
        boolean allowed=db.count("SELECT COUNT(*) FROM user_has_organize m JOIN `user` u ON u.id=m.user_id JOIN `event` e ON e.id=? WHERE m.user_id=? AND m.organization_id=? AND m.access_state='APPROVED' AND u.user_status_id=1 AND e.published_by=u.id AND e.organization_id=m.organization_id",row.get("event_id"),row.get("created_by"),row.get("organization_id"))==1;
        if(!notice&&!allowed) { db.update("UPDATE participant_campaign SET campaign_state='BLOCKED' WHERE id=?",id); return; }
        db.update("UPDATE participant_campaign SET campaign_state='DISPATCHING',started_at=COALESCE(started_at,UTC_TIMESTAMP(6)) WHERE id=?",id);
        var recipients=db.rows("SELECT DISTINCT u.id,u.email FROM booking b JOIN `user` u ON u.id=b.user_id WHERE b.event_id=? AND u.id>? AND (b.created_at IS NULL OR b.created_at<=(SELECT started_at FROM participant_campaign WHERE id=?)) ORDER BY u.id LIMIT 100",row.get("event_id"),row.get("recipient_cursor"),id);
        for(var recipient:recipients) {
            db.update("INSERT INTO admin_email_outbox(campaign_id,recipient_user_id,recipient,subject,body,available_at,created_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",id,recipient.get("id"),recipient.get("email"),row.get("subject"),row.get("body"));
        }
        if(!recipients.isEmpty()) db.update("UPDATE participant_campaign SET recipient_cursor=? WHERE id=?",recipients.getLast().get("id"),id);
        if(recipients.size()<100) db.update("UPDATE participant_campaign SET campaign_state='QUEUED' WHERE id=?",id);
    }
}
