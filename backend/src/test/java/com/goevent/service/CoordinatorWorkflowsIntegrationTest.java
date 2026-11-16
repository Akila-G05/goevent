package com.goevent.service;

import com.goevent.dto.CoordinatorRequests.*;
import com.goevent.repository.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.transaction.*;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.mock.web.MockMultipartFile;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.mysql.MySQLContainer;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.anyString;
import com.goevent.dto.CoordinatorRequests.Package;

@Testcontainers(disabledWithoutDocker=false)
class CoordinatorWorkflowsIntegrationTest {
    @Container static final MySQLContainer mysql=new MySQLContainer("mysql:8.4")
        .withTmpFs(Map.of("/var/lib/mysql","rw,size=1g")).withDatabaseName("coordinator_test")
        .withUsername("workflow_test").withPassword("disposable-test-password");
    @Configuration @EnableTransactionManagement static class Config {
        @Bean javax.sql.DataSource dataSource(){return new DriverManagerDataSource(mysql.getJdbcUrl(),mysql.getUsername(),mysql.getPassword());}
        @Bean JdbcTemplate jdbc(javax.sql.DataSource source){return new JdbcTemplate(source);}
        @Bean PlatformTransactionManager manager(javax.sql.DataSource source){return new DataSourceTransactionManager(source);}
        @Bean AdminRepository db(JdbcTemplate jdbc){return new AdminRepository(jdbc);}
        @Bean CoordinatorRepository repo(AdminRepository db){return new CoordinatorRepository(db);}
        @Bean CoordinatorService service(AdminRepository db,CoordinatorRepository repo){return new CoordinatorService(db,repo,true,true);}
        @Bean PublicEventService publicEvents(CoordinatorRepository db){return new PublicEventService(db);}
        @Bean ParticipantCampaignRepository campaigns(AdminRepository db){return new ParticipantCampaignRepository(db);}
    }
    AnnotationConfigApplicationContext context;AdminRepository db;CoordinatorService service;int admin,user,other,org,org2;
    @BeforeEach void setup(){
        Flyway.configure().dataSource(mysql.getJdbcUrl(),mysql.getUsername(),mysql.getPassword()).cleanDisabled(false).load().clean();
        Flyway.configure().dataSource(mysql.getJdbcUrl(),mysql.getUsername(),mysql.getPassword()).load().migrate();
        context=new AnnotationConfigApplicationContext(Config.class);db=context.getBean(AdminRepository.class);service=context.getBean(CoordinatorService.class);
        admin=user("admin",3);user=user("owner",1);other=user("other",1);
        org=(int)db.insert("INSERT INTO organization(name,org_type_id) VALUES('Fixture organization',1)");
        org2=(int)db.insert("INSERT INTO organization(name,org_type_id) VALUES('Other organization',1)");
    }
    @AfterEach void close(){context.close();}
    int user(String name,int role){return (int)db.createAccount("Test",name,name+"@example.invalid","unused-test-hash",role,1);}
    void status(int status,Runnable task){assertEquals(status,assertThrows(ResponseStatusException.class,task::run).getStatusCode().value());}
    long proof(int owner,String purpose){return db.insert("INSERT INTO private_document(owner_id,purpose,media_type,byte_size,sha256,content,created_at) VALUES(?,?,'application/pdf',1,REPEAT('0',64),?,UTC_TIMESTAMP(6))",owner,purpose,new byte[]{1});}
    long apply(int owner,int organization){return service.apply(owner,new Application(organization,null,null,"Chair","contact@example.invalid","0700000000","Authorization explanation",proof(owner,"AUTHORIZATION")));}
    void approve(int owner,int organization){service.reviewApplication(admin,apply(owner,organization),new Review(true,"Verified",null,false));}
    Event content(String name,String start){return new Event(name,"Description",1,2,1,"Venue","Address","Colombo","Asia/Colombo",start,Instant.parse(start).plusSeconds(3600).toString(),"","","https://example.invalid/video",proof(user,"EVENT"),"Thank you","LKR",List.of(),List.of(),18,5,true);}
    int draft(){approve(user,org);return (int)service.create(user,org,content("Draft","2027-06-01T03:30:00Z"));}
    int version(int id){return ((Number)db.event(id).get("revision")).intValue();}
    void publish(int id){service.submit(user,org,id,version(id));service.reviewEvent(admin,id,true,version(id),"Approved exact revision");}
    @Test void applicationsArePerOrganizationProofPrivateAndRevocationIsScoped(){
        long first=apply(user,org);status(409,()->apply(user,org));long second=apply(user,org2);
        status(403,()->service.document(other,false,((Number)db.coordinator(first).get("proof_id")).longValue()));
        service.reviewApplication(admin,first,new Review(true,"Verified",null,false));service.reviewApplication(admin,second,new Review(true,"Verified",null,false));
        assertEquals(2,service.workspaces(user).size());assertTrue(service.applications(user,1,25).isEmpty());
        long membership=((Number)service.workspaces(user).getFirst().get("id")).longValue();
        int revokedOrg=((Number)service.workspaces(user).getFirst().get("organization_id")).intValue();
        service.revokeMembership(admin,membership,"Committee changed");status(403,()->service.member(user,revokedOrg));assertEquals(1,service.workspaces(user).size());assertTrue(db.active(user));
        assertTrue(service.applications(user).stream().anyMatch(r->r.get("revoked_at")!=null));
        status(400,()->service.apply(other,new Application(org,null,null,"Chair","contact@example.invalid","0700","Explanation",proof(user,"AUTHORIZATION"))));
    }
    @Test void proposedOrganizationNeedsExplicitAdminResolutionAndRejectedApplicationCanResubmit(){
        long id=service.apply(user,new Application(null,"New committee",1,"Chair","contact@example.invalid","0700","Explanation",proof(user,"AUTHORIZATION")));
        status(400,()->service.reviewApplication(admin,id,new Review(true,"Verified",null,false)));
        service.reviewApplication(admin,id,new Review(true,"Verified proposal",null,true));assertEquals(1,service.workspaces(user).size());
        long rejected=apply(other,org);service.reviewApplication(admin,rejected,new Review(false,"Missing authorization",null,false));assertTrue(apply(other,org)>rejected);
    }
    @Test void revisionsFreezeAndApprovedReplacementPreservesPublicContentUntilReview(){
        int id=draft();var publicEvents=context.getBean(PublicEventService.class);status(404,()->publicEvents.event(id));
        service.submit(user,org,id,1);status(409,()->service.save(user,org,id,new Save(2,content("Tamper","2027-06-01T03:30:00Z"))));
        service.reviewEvent(admin,id,false,version(id),"Correct the title");
        service.save(user,org,id,new Save(version(id),content("Corrected","2027-06-01T03:30:00Z")));publish(id);
        assertEquals("Corrected",publicEvents.event(id).get("name"));assertFalse(publicEvents.event(id).get("content").toString().contains("approvalDocumentId"));
        int old=version(id);service.save(user,org,id,new Save(old,content("Rescheduled","2027-07-01T03:30:00Z")));
        status(409,()->service.save(user,org,id,new Save(old,content("Stale","2027-08-01T03:30:00Z"))));
        assertEquals("Corrected",publicEvents.event(id).get("name"));publish(id);assertEquals("Rescheduled",publicEvents.event(id).get("name"));
        assertEquals(1,db.count("SELECT COUNT(*) FROM participant_campaign WHERE event_id=? AND system_notice=TRUE",id));
        status(403,()->service.detail(other,org,id));approve(user,org2);status(403,()->service.detail(user,org2,id));
    }
    @Test void concurrentReviewsHaveOneWinnerAndImpressionsAreDeduplicated() throws Exception {
        int id=draft();service.submit(user,org,id,1);int version=version(id);var pool=Executors.newFixedThreadPool(2);var start=new CountDownLatch(1);
        try {
            var a=pool.submit(()->{start.await();try{service.reviewEvent(admin,id,true,version,"Approve");return true;}catch(ResponseStatusException e){return false;}});
            var b=pool.submit(()->{start.await();try{service.reviewEvent(admin,id,false,version,"Reject");return true;}catch(ResponseStatusException e){return false;}});
            start.countDown();assertNotEquals(a.get(10,TimeUnit.SECONDS),b.get(10,TimeUnit.SECONDS));
        }finally{pool.shutdownNow();}
        if(((Number)db.event(id).get("event_status_id")).intValue()!=2){service.save(user,org,id,new Save(version(id),content("Retry","2027-06-01T03:30:00Z")));publish(id);}
        var publicEvents=context.getBean(PublicEventService.class);publicEvents.impression(id,"session-a");publicEvents.impression(id,"session-a");publicEvents.impression(id,"session-b");assertEquals(2,db.count("SELECT SUM(impressions) FROM event_impression_count WHERE event_id=?",id));
        var report=service.statistics(user,org,Instant.parse("2026-01-01T00:00:00Z"),Instant.parse("2028-01-01T00:00:00Z"));assertNotNull(report.get("notice"));
    }
    long booking(int id,int attendee){return db.insert("INSERT INTO booking(user_id,event_id,booking_reference,total_amount,created_at) VALUES(?,?,'=FORMULA',0,UTC_TIMESTAMP())",attendee,id);}
    @Test void cancellationAndCsvPreserveBookingsAndPaymentHistory(){
        int id=draft();publish(id);long booking=booking(id,other);
        db.update("INSERT INTO payment(id,payment_method_id,booking_id,amount,created_at,updated_at,p_status_id,currency) VALUES(9001,1,?,'0',UTC_TIMESTAMP(),UTC_TIMESTAMP(),2,'LKR')",booking);
        String csv=service.export(user,org,id);assertTrue(csv.contains("\"'=FORMULA\""));assertFalse(csv.contains("qr_token"));assertTrue(csv.contains("other@example.invalid"));
        status(409,()->service.remove(user,org,id,new Removal(version(id),"Delete"),true));
        service.remove(user,org,id,new Removal(version(id),"Cancelled due to weather"),false);
        assertEquals(1,db.count("SELECT COUNT(*) FROM booking WHERE id=?",booking));assertEquals(1,db.count("SELECT COUNT(*) FROM payment WHERE booking_id=?",booking));
        assertEquals(1,db.count("SELECT COUNT(*) FROM participant_campaign WHERE event_id=? AND system_notice=TRUE",id));status(404,()->context.getBean(PublicEventService.class).event(id));
    }
    @Test void draftDeletionAndEligibilityValidation(){
        int id=draft();service.remove(user,org,id,new Removal(1,"Unused draft"),true);assertNull(db.event(id));
        Event invalid=new Event("Paid","Description",1,2,3,"Venue","","City","Asia/Colombo","2027-06-01T03:30:00Z","2027-06-01T04:30:00Z","","","",null,"","LKR",List.of(new Package("VIP","Benefits",1,new BigDecimal("1.001"),"2027-05-01T00:00:00Z","2027-05-02T00:00:00Z",List.of())),List.of(),0,5,false);
        status(400,()->service.create(user,org,invalid));
        db.update("UPDATE `user` SET user_status_id=2 WHERE id=?",user);status(403,()->service.create(user,org,content("Disabled","2027-06-01T03:30:00Z")));
    }
    @Test void campaignTimingScopingCancellationAccessRecheckAndDurableRetry(){
        int id=draft();publish(id);booking(id,other);booking(id,other);
        long later=service.campaign(user,org,id,new Campaign("Later","Plain text","2027-05-01T10:00",true));
        assertEquals(LocalDateTime.parse("2027-05-01T04:30:00"),db.one("SELECT scheduled_at FROM participant_campaign WHERE id=?",later).get("scheduled_at"));
        var dispatcher=context.getBean(ParticipantCampaignRepository.class);dispatcher.enqueueBatch();assertEquals(0,db.count("SELECT COUNT(*) FROM admin_email_outbox WHERE campaign_id=?",later));service.cancelCampaign(user,org,id,later);
        long now=service.campaign(user,org,id,new Campaign("Now","Plain text",null,true));dispatcher.enqueueBatch();dispatcher.enqueueBatch();
        assertEquals(1,db.count("SELECT COUNT(*) FROM admin_email_outbox WHERE campaign_id=?",now));
        var outbox=new AdminEmailRepository(db,context.getBean(PlatformTransactionManager.class));var delivery=mock(AdminEmailDelivery.class);
        when(delivery.send(anyString(),anyString(),anyString())).thenReturn("fake-acceptance");
        new AdminEmailWorker(outbox,delivery).deliverOne();new AdminEmailWorker(outbox,delivery).deliverOne();assertEquals("ACCEPTED",db.one("SELECT status FROM admin_email_outbox WHERE campaign_id=?",now).get("status"));
        long blocked=service.campaign(user,org,id,new Campaign("Blocked","Plain text",null,true));
        service.revokeMembership(admin,((Number)service.workspaces(user).getFirst().get("id")).longValue(),"Revoked");dispatcher.enqueueBatch();
        assertEquals("BLOCKED",db.one("SELECT campaign_state FROM participant_campaign WHERE id=?",blocked).get("campaign_state"));
        assertEquals(0,db.count("SELECT COUNT(*) FROM admin_email_outbox WHERE campaign_id=?",blocked));
    }
    @Test void privateDocumentsValidateContentAndScope() throws Exception {
        status(400,()->{try{service.upload(user,"AUTHORIZATION",new MockMultipartFile("file","fake.pdf","application/pdf","not a pdf".getBytes()));}catch(java.io.IOException e){throw new RuntimeException(e);}});
        long id=service.upload(user,"AUTHORIZATION",new MockMultipartFile("file","proof.pdf","application/pdf","%PDF-1.4\n1 0 obj <<>> endobj\n%%EOF".getBytes()));
        assertNotNull(service.document(user,false,id));assertNotNull(service.document(admin,true,id));status(403,()->service.document(other,false,id));
    }
    @Test void v4BackfillKeepsOnlyLatestAccessAndAllowsHistoricalOrganizationReapproval(){
        var old=Flyway.configure().dataSource(mysql.getJdbcUrl(),mysql.getUsername(),mysql.getPassword()).cleanDisabled(false).target("4").load();old.clean();old.migrate();
        int owner=user("legacy",2),ambiguous=user("ambiguous",2);
        int organization=((Number)db.one("SELECT id FROM organization LIMIT 1").get("id")).intValue();
        int organization2=(int)db.insert("INSERT INTO organization(name,org_type_id) VALUES('Second legacy',1)");
        db.update("INSERT INTO user_has_organize(user_id,organization_id,position) VALUES(?,?,'Old'),(?,?,'Latest'),(?,?,'A'),(?,?,'B')",owner,organization,owner,organization,ambiguous,organization,ambiguous,organization2);
        // V4 uses date first, not just insertion ID: the earlier A row is current here.
        db.update("UPDATE user_has_organize SET registered_date=CASE WHEN organization_id=? THEN '2026-11-01' ELSE '2025-11-01' END WHERE user_id=?",organization,ambiguous);
        int suspended=user("suspended-legacy",2), ordinary=user("ordinary-legacy",1);
        db.update("UPDATE `user` SET user_status_id=2 WHERE id=?",suspended);
        db.update("INSERT INTO user_has_organize(user_id,organization_id,position) VALUES(?,?,'Suspended'),(?,?,'Historical')",suspended,organization,ordinary,organization);
        long venue=db.insert("INSERT INTO venue(name,city) VALUES('Legacy','City')"),img=db.insert("INSERT INTO img(path) VALUES('legacy.png')"),link=db.insert("INSERT INTO link(link_name,link) VALUES('Legacy','https://example.invalid')");
        int clear=(int)db.insert("INSERT INTO `event`(name,category_id,venue_id,event_status_id,audience_id,event_level_id,img_id,link_id,published_by,aproved_by) VALUES('Clear',1,?,2,2,1,?,?,?,NULL)",venue,img,link,owner);
        int unclear=(int)db.insert("INSERT INTO `event`(name,category_id,venue_id,event_status_id,audience_id,event_level_id,img_id,link_id,published_by,aproved_by) VALUES('Unclear',1,?,2,2,1,?,?,?,NULL)",venue,img,link,ambiguous);
        long booking=booking(clear,owner);db.update("INSERT INTO payment(id,payment_method_id,booking_id,amount,created_at,updated_at,p_status_id) VALUES(9101,1,?,'12.50',UTC_TIMESTAMP(),UTC_TIMESTAMP(),2)",booking);
        Flyway.configure().dataSource(mysql.getJdbcUrl(),mysql.getUsername(),mysql.getPassword()).load().migrate();
        assertEquals(organization,((Number)db.event(clear).get("organization_id")).intValue());
        assertNull(db.event(unclear).get("organization_id"));
        assertEquals(6,db.count("SELECT COUNT(*) FROM user_has_organize"));
        assertEquals(2,db.count("SELECT COUNT(*) FROM user_has_organize WHERE access_state='APPROVED'"));
        assertEquals("Latest",service.workspaces(owner).getFirst().get("position"));
        service.member(ambiguous,organization);
        status(403,()->service.member(ambiguous,organization2));
        status(403,()->service.member(suspended,organization));
        status(403,()->service.member(ordinary,organization));
        int reviewer=user("migration-reviewer",3);
        long request=apply(ambiguous,organization2);
        status(403,()->service.member(ambiguous,organization2));
        service.reviewApplication(reviewer,request,new Review(true,"Fresh authorization verified",null,false));
        assertEquals(2,service.workspaces(ambiguous).size());
        assertEquals(1,db.count("SELECT COUNT(*) FROM user_has_organize WHERE user_id=? AND organization_id=? AND access_state='REVOKED'",ambiguous,organization2));
        assertEquals(1,db.count("SELECT COUNT(*) FROM payment WHERE id=9101"));
        assertEquals(1,db.count("SELECT COUNT(*) FROM booking WHERE id=?",booking));
    }
    @Test void retriesExhaustWithoutRealEmailAndDisabledCampaignDeliveryStaysQueued(){
        int id=draft();publish(id);booking(id,other);
        long campaign=service.campaign(user,org,id,new Campaign("Retry","Message",null,true));
        context.getBean(ParticipantCampaignRepository.class).enqueueBatch();
        var manager=context.getBean(PlatformTransactionManager.class);
        var disabled=new AdminEmailRepository(db,manager,false);var adminMessage=disabled.claim();assertNotNull(adminMessage);
        disabled.accepted(((Number)adminMessage.get("id")).longValue(),1,"fake-admin");assertNull(disabled.claim());
        var outbox=new AdminEmailRepository(db,manager,true);var delivery=mock(AdminEmailDelivery.class);
        when(delivery.send(anyString(),anyString(),anyString())).thenThrow(new IllegalStateException("fake timeout"));
        var worker=new AdminEmailWorker(outbox,delivery);
        for(int attempt=0;attempt<5;attempt++){
            db.update("UPDATE admin_email_outbox SET available_at=UTC_TIMESTAMP(6) WHERE campaign_id=?",campaign);worker.deliverOne();
        }
        assertEquals("FAILED",db.one("SELECT status FROM admin_email_outbox WHERE campaign_id=?",campaign).get("status"));
        worker.deliverOne();verify(delivery,times(5)).send(anyString(),anyString(),anyString());
    }
    @Test void concurrentCampaignWorkersProduceOneDeliveryPerRecipient() throws Exception {
        int id=draft();publish(id);
        for(int i=0;i<101;i++)booking(id,user("participant-"+i,1));
        long campaign=service.campaign(user,org,id,new Campaign("Batch","Message",null,true));
        var dispatcher=context.getBean(ParticipantCampaignRepository.class);var pool=Executors.newFixedThreadPool(2);var start=new CountDownLatch(1);
        try{
            var a=pool.submit(()->{start.await();dispatcher.enqueueBatch();return true;});
            var b=pool.submit(()->{start.await();dispatcher.enqueueBatch();return true;});
            start.countDown();assertTrue(a.get(15,TimeUnit.SECONDS));assertTrue(b.get(15,TimeUnit.SECONDS));
        }finally{pool.shutdownNow();}
        assertEquals(101,db.count("SELECT COUNT(*) FROM admin_email_outbox WHERE campaign_id=?",campaign));
        assertEquals("QUEUED",db.one("SELECT campaign_state FROM participant_campaign WHERE id=?",campaign).get("campaign_state"));
        assertEquals(101,db.count("SELECT COUNT(DISTINCT recipient_user_id) FROM admin_email_outbox WHERE campaign_id=?",campaign));
        assertEquals(1,service.campaigns(user,org,id,0,25).size());
    }
    @Test void statisticsUseInclusiveExclusiveUtcBoundariesAndTitleEditDoesNotReschedule(){
        int id=draft();assertEquals(1,service.events(user,org,"DRAFT",null,null,0,25).size());publish(id);assertEquals(1,service.events(user,org,"UPCOMING",null,null,0,25).size());long first=booking(id,other),last=booking(id,other);
        db.update("UPDATE booking SET created_at='2026-11-01 00:00:00' WHERE id=?",first);
        db.update("UPDATE booking SET created_at='2026-11-02 00:00:00' WHERE id=?",last);
        var report=service.statistics(user,org,Instant.parse("2026-11-01T00:00:00Z"),Instant.parse("2026-11-02T00:00:00Z"));
        assertEquals(1L,report.get("bookings"));
        service.save(user,org,id,new Save(version(id),content("Title only","2027-06-01T03:30:00Z")));publish(id);
        assertEquals(0,db.count("SELECT COUNT(*) FROM participant_campaign WHERE system_notice=TRUE"));
        assertEquals("\"'  =SUM(1,2)\"",CoordinatorService.csvCell("  =SUM(1,2)"));
        assertEquals("\"line\"\"break\"",CoordinatorService.csvCell("line\"break"));
    }
    @Test void individualEventStatisticsEnforceOwnershipOrganizationAndDateBoundaries(){
        int event=draft(); publish(event);
        int second=(int)service.create(user,org,content("Second own event","2027-06-02T03:30:00Z"));publish(second);
        int outsider=(int)service.create(user,org,content("Other owner's event","2027-06-03T03:30:00Z"));
        db.update("UPDATE `event` SET published_by=? WHERE id=?",other,outsider);
        approve(user,org2);
        int otherOrg=(int)service.create(user,org2,content("Other organization","2027-06-04T03:30:00Z"));
        long included=booking(event,other),atEnd=booking(event,other),unknown=booking(event,other);
        long secondBooking=booking(second,other),outsideBooking=booking(outsider,other),otherOrgBooking=booking(otherOrg,other);
        db.update("UPDATE booking SET created_at='2026-11-01 00:00:00' WHERE id IN (?,?,?,?)",included,secondBooking,outsideBooking,otherOrgBooking);
        db.update("UPDATE booking SET created_at='2026-11-02 00:00:00' WHERE id=?",atEnd);
        db.update("UPDATE booking SET created_at=NULL WHERE id=?",unknown);
        long date=db.insert("INSERT INTO event_dates(`date`,`time`,event_id) VALUES('2027-06-01','09:00',?)",event);
        long tier=db.insert("INSERT INTO ticket(event_dates_id,qty,price,description,sale_start_at,sale_end_at) VALUES(?,100,12.5,'General','2027-05-01','2027-05-31')",date);
        db.update("INSERT INTO booking_item(booking_id,ticket_id,qty,unit_price) VALUES(?,?,'2','12.50'),(?,?,'99','12.50'),(?,?,'bad','12.50')",included,tier,atEnd,tier,included,tier);
        db.update("INSERT INTO payment(id,payment_method_id,booking_id,amount,created_at,updated_at,p_status_id,currency) VALUES(9201,1,?,'12.50','2026-11-01','2026-11-01',2,'LKR'),(9202,1,?,'2.50','2026-11-01','2026-11-01',5,'LKR'),(9203,1,?,'invalid','2026-11-01','2026-11-01',2,'USD'),(9204,1,?,'999','2026-11-02','2026-11-02',2,'LKR'),(9205,1,?,'500','2026-11-01','2026-11-01',2,'LKR'),(9206,1,?,'700','2026-11-01','2026-11-01',2,'LKR')",included,included,included,included,outsideBooking,otherOrgBooking);
        db.update("INSERT INTO event_impression_count(event_id,measured_at,impressions) VALUES(?,'2026-11-01',7),(?,'2026-11-02',99),(?,'2026-11-01',3),(?,'2026-11-01',100),(?,'2026-11-01',100)",event,event,second,outsider,otherOrg);
        Instant from=Instant.parse("2026-11-01T00:00:00Z"),to=Instant.parse("2026-11-02T00:00:00Z");
        var all=service.statistics(user,org,from,to);assertEquals(2L,all.get("events"));assertEquals(2L,all.get("bookings"));
        var scoped=service.statistics(user,org,from,to,event);assertEquals(event,scoped.get("selectedEventId"));assertEquals(1L,scoped.get("events"));assertEquals(1L,scoped.get("bookings"));
        assertEquals(7,((Number)((Map<?,?>)scoped.get("impressions")).get("measured")).intValue());
        var tickets=(Map<?,?>)scoped.get("ticketQuantities");assertEquals("2",tickets.get("booked_quantity"));assertEquals(1,((Number)tickets.get("invalid_quantities")).intValue());
        var payments=(List<?>)scoped.get("payments");assertEquals(2,payments.size());
        var lkr=(Map<?,?>)payments.getFirst();assertEquals("LKR",lkr.get("currency"));assertEquals(0,new BigDecimal("12.50").compareTo(new BigDecimal(lkr.get("paid_amount").toString())));assertEquals(0,new BigDecimal("2.50").compareTo(new BigDecimal(lkr.get("refunded_state_amount").toString())));assertNull(lkr.get("net_recorded_amount"));
        var usd=(Map<?,?>)payments.getLast();assertNull(usd.get("paid_amount"));assertEquals(1,((Number)usd.get("invalid_amounts")).intValue());
        assertEquals(1,((List<?>)scoped.get("eventStates")).size());
        // Legacy pending/rejected rows may not have an event_revision yet.
        db.update("UPDATE `event` SET published_revision_id=NULL,working_revision_id=NULL,event_status_id=3 WHERE id=?",second);
        var legacy=service.statistics(user,org,from,to,second);
        assertEquals("REJECTED",((Map<?,?>)((List<?>)legacy.get("eventStates")).getFirst()).get("phase"));
        db.update("UPDATE `event` SET event_status_id=1 WHERE id=?",second);
        assertEquals("PENDING",((Map<?,?>)((List<?>)service.statistics(user,org,from,to,second).get("eventStates")).getFirst()).get("phase"));
        assertEquals(1,((Number)((Map<?,?>)scoped.get("unavailableHistory")).get("bookings_without_time")).intValue());
        status(403,()->service.statistics(user,org,from,to,outsider));status(403,()->service.statistics(user,org,from,to,otherOrg));status(400,()->service.statistics(user,org,from,to,0));status(404,()->service.statistics(user,org,from,to,99999999));
        long membership=((Number)service.workspaces(user).stream().filter(row->((Number)row.get("organization_id")).intValue()==org).findFirst().orElseThrow().get("id")).longValue();
        service.revokeMembership(admin,membership,"No longer authorized");status(403,()->service.statistics(user,org,from,to,event));
    }
}
