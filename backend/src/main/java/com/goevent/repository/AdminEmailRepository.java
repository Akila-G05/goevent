package com.goevent.repository;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import java.util.Map;

@Repository
public class AdminEmailRepository {
    private final AdminRepository db;
    private final TransactionTemplate transactions;
    public AdminEmailRepository(AdminRepository db,PlatformTransactionManager manager) { this.db=db; transactions=new TransactionTemplate(manager); }
    public Map<String,Object> claim() {
        return transactions.execute(status -> {
            db.update("UPDATE admin_email_outbox SET status='FAILED',leased_at=NULL WHERE status='PROCESSING' AND attempts>=5 AND leased_at<UTC_TIMESTAMP(6)-INTERVAL 10 MINUTE");
            var row=db.one("SELECT * FROM admin_email_outbox WHERE attempts<5 AND ((status='QUEUED' AND available_at<=UTC_TIMESTAMP(6)) OR (status='PROCESSING' AND leased_at<UTC_TIMESTAMP(6)-INTERVAL 10 MINUTE)) ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED");
            if(row==null) return null;
            db.update("UPDATE admin_email_outbox SET status='PROCESSING',attempts=attempts+1,leased_at=UTC_TIMESTAMP(6) WHERE id=?",row.get("id"));
            row.put("attempts",((Number)row.get("attempts")).intValue()+1); return row;
        });
    }
    public void accepted(long id,int attempts,String operation) { db.update("UPDATE admin_email_outbox SET status='ACCEPTED',provider_operation_id=?,leased_at=NULL WHERE id=? AND status='PROCESSING' AND attempts=?",operation,id,attempts); }
    public void failed(long id,int attempts) { db.update("UPDATE admin_email_outbox SET status=?,leased_at=NULL,available_at=TIMESTAMPADD(SECOND,?,UTC_TIMESTAMP(6)) WHERE id=? AND status='PROCESSING' AND attempts=?",attempts>=5?"FAILED":"QUEUED",Math.min(3600,60*(1<<Math.min(attempts,5))),id,attempts); }
}
