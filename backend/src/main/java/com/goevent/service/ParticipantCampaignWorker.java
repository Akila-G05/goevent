package com.goevent.service;

import com.goevent.repository.ParticipantCampaignRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name={"app.coordinator.enabled","app.coordinator.campaigns-enabled"},havingValue="true")
public class ParticipantCampaignWorker {
    private final ParticipantCampaignRepository db;
    public ParticipantCampaignWorker(ParticipantCampaignRepository db) { this.db=db; }
    @Scheduled(fixedDelayString="${app.coordinator.campaign-delay-ms:5000}")
    public void enqueue() { db.enqueueBatch(); }
}
