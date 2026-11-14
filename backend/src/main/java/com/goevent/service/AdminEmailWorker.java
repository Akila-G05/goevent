package com.goevent.service;

import com.goevent.repository.AdminEmailRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name="app.email.enabled",havingValue="true")
public class AdminEmailWorker {
    private final AdminEmailRepository db;
    private final AdminEmailDelivery delivery;
    public AdminEmailWorker(AdminEmailRepository db,AdminEmailDelivery delivery) { this.db=db; this.delivery=delivery; }
    @Scheduled(fixedDelayString="${app.email.worker-delay-ms:5000}")
    public void deliverOne() {
        var row=db.claim(); if(row==null) return;
        long id=((Number)row.get("id")).longValue();
        try {
            String operation=delivery.send(row.get("recipient").toString(),row.get("subject").toString(),row.get("body").toString());
            db.accepted(id,((Number)row.get("attempts")).intValue(),operation);
        } catch(RuntimeException error) {
            // Persist a retry without logging recipients, bodies, credentials or SDK error payloads.
            db.failed(id,((Number)row.get("attempts")).intValue());
        }
    }
}
