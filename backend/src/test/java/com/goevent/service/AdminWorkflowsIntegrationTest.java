package com.goevent.service;

import com.goevent.dto.AdminRequests.*;
import com.goevent.repository.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.web.server.ResponseStatusException;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.mysql.MySQLContainer;
import java.time.Instant;
import java.util.concurrent.*;
import java.util.List;
import java.util.Map;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

@Testcontainers
class AdminWorkflowsIntegrationTest {
    @Container static MySQLContainer mysql=new MySQLContainer("mysql:8.4")
        .withTmpFs(Map.of("/var/lib/mysql","rw,size=1g"))
        .withDatabaseName("admin_workflow_test").withUsername("workflow_test").withPassword("disposable-test-password");
    private AnnotationConfigApplicationContext context;
    private AdminRepository db;
    private AdminManagementService service;
    private int admin, applicant, organization;
    @Configuration @EnableTransactionManagement
    static class Config {
        @Bean javax.sql.DataSource dataSource() { return new DriverManagerDataSource(mysql.getJdbcUrl(),mysql.getUsername(),mysql.getPassword()); }
        @Bean JdbcTemplate jdbc(javax.sql.DataSource source) { return new JdbcTemplate(source); }
        @Bean PlatformTransactionManager manager(javax.sql.DataSource source) { return new DataSourceTransactionManager(source); }
        @Bean AdminRepository repository(JdbcTemplate jdbc) { return new AdminRepository(jdbc); }
        @Bean AdminManagementService service(AdminRepository db) { return new AdminManagementService(db,new BCryptPasswordEncoder(4)); }
    }
    @BeforeEach void setup() {
        // The URL comes only from this disposable Testcontainer, never host config.
        var flyway=Flyway.configure().dataSource(mysql.getJdbcUrl(),mysql.getUsername(),mysql.getPassword())
            .cleanDisabled(false).load();
        flyway.clean(); flyway.migrate();
        context=new AnnotationConfigApplicationContext(Config.class);
        db=context.getBean(AdminRepository.class); service=context.getBean(AdminManagementService.class);
        admin=user("admin-fixture@example.invalid",3); applicant=user("applicant-fixture@example.invalid",1);
        organization=((Number)db.one("SELECT id FROM organization ORDER BY id LIMIT 1").get("id")).intValue();
    }
    @AfterEach void close() { context.close(); }
    private int user(String email,int role) { return (int)db.createAccount("Test","Fixture",email,new BCryptPasswordEncoder(4).encode("test-password"),role,1); }
    private int eventFixture() {
        db.update("UPDATE `user` SET role_id=2 WHERE id=?",applicant);
        long venue=db.insert("INSERT INTO venue(name,address,city,link) VALUES('Fixture',NULL,'Colombo',NULL)");
        long image=db.insert("INSERT INTO img(path,bannerpath) VALUES('fixture.png',NULL)");
        long link=db.insert("INSERT INTO link(link_name,link) VALUES('Fixture','https://example.invalid')");
        return (int)db.insert("INSERT INTO `event`(name,category_id,venue_id,event_status_id,audience_id,event_level_id,img_id,link_id,published_by,aproved_by) VALUES('Fixture',1,?,1,1,1,?,?,?,NULL)",venue,image,link,applicant);
    }
    private void status(int expected,Runnable action) { assertEquals(expected,assertThrows(ResponseStatusException.class,action::run).getStatusCode().value()); }
    @Test void coordinatorApprovalIsAtomicAndRejectsDuplicateOrRepeatedDecisions() {
        long request=service.requestCoordinator(applicant,new Coordinator(organization,"Coordinator","Request access"));
        status(409,()->service.requestCoordinator(applicant,new Coordinator(organization,"Coordinator","Request access")));
        assertEquals(1,((Number)db.account(applicant).get("role_id")).intValue());
        service.decideRequest(admin,request,new Decision(true,"Verified organization"));
        assertEquals(2,((Number)db.account(applicant).get("role_id")).intValue());
        assertEquals(1,db.count("SELECT COUNT(*) FROM admin_audit WHERE action='APPROVE_COORDINATOR'"));
        assertEquals(1,db.count("SELECT COUNT(*) FROM admin_email_outbox"));
        status(409,()->service.decideRequest(admin,request,new Decision(false,"Repeated decision")));
        service.revoke(admin,applicant,"Access no longer required");
        assertEquals(1,((Number)db.account(applicant).get("role_id")).intValue());
        assertEquals(1,((Number)db.account(applicant).get("user_status_id")).intValue());
        long again=service.requestCoordinator(applicant,new Coordinator(organization,"New position","Request again"));
        service.decideRequest(admin,again,new Decision(true,"Verified again"));
        assertEquals(2,db.count("SELECT COUNT(*) FROM user_has_organize WHERE user_id=?",applicant));
        var profiles=new UserRepo(context.getBean(JdbcTemplate.class));
        assertEquals("New position",profiles.getOrganizerDetail(applicant).get("position"));
    }
    @Test void rejectedRequestPreservesUserAndLinkedRecordsBlockDeletion() {
        long request=service.requestCoordinator(applicant,new Coordinator(organization,"Coordinator","Request access"));
        service.decideRequest(admin,request,new Decision(false,"Not verified"));
        assertTrue(db.active(applicant)); assertEquals(1,((Number)db.account(applicant).get("role_id")).intValue());
        status(409,()->service.delete(admin,applicant,"Requested deletion"));
        service.access(admin,applicant,false,"Account disabled"); assertFalse(db.active(applicant));
    }
    @Test void studentRoleIsRestoredAfterCoordinatorRevocation() {
        int student=user("student-fixture@example.invalid",4);
        long request=service.requestCoordinator(student,new Coordinator(organization,"Coordinator","Student request"));
        service.decideRequest(admin,request,new Decision(true,"Verified student coordinator"));
        service.revoke(admin,student,"Role no longer needed");
        assertEquals(4,((Number)db.account(student).get("role_id")).intValue());
        assertTrue(db.active(student));
    }
    @Test void unlinkedAccountCanBeDeletedButSelfAndLastAdminCannot() {
        service.delete(admin,applicant,"Requested deletion"); assertNull(db.account(applicant));
        assertEquals(1,db.count("SELECT COUNT(*) FROM admin_audit WHERE action='DELETE_ACCOUNT'"));
        status(409,()->service.access(admin,admin,false,"Self disable"));
        status(409,()->service.delete(admin,admin,"Self delete"));
    }
    @Test void concurrentAdminDisablingNeverRemovesBothAdministrators() throws Exception {
        int other=user("second-admin@example.invalid",3);
        var start=new CountDownLatch(1); var pool=Executors.newFixedThreadPool(2);
        try {
            var first=pool.submit(()->{ start.await(); try { service.access(admin,other,false,"Concurrent test"); return true; } catch(ResponseStatusException error) { return false; } });
            var second=pool.submit(()->{ start.await(); try { service.access(other,admin,false,"Concurrent test"); return true; } catch(ResponseStatusException error) { return false; } });
            start.countDown(); assertNotEquals(first.get(15,TimeUnit.SECONDS),second.get(15,TimeUnit.SECONDS));
            assertEquals(1,db.count("SELECT COUNT(*) FROM `user` WHERE id IN (?,?) AND role_id=3 AND user_status_id=1",admin,other));
            assertTrue(db.activeAdmins()>=1);
        } finally { pool.shutdownNow(); }
    }
    @Test void contactReplyAndNotificationCommitTogether() {
        long message=service.contact(new Contact("contact@example.invalid","Question","Please help"));
        service.reply(admin,message,"Support reply");
        assertNotNull(service.contact(message).get("replied_at"));
        assertEquals(1,db.count("SELECT COUNT(*) FROM admin_email_outbox"));
        status(409,()->service.reply(admin,message,"Duplicate reply"));
    }
    @Test void invalidAccountEditRollsBackAndNoPasswordHashIsExposed() {
        status(409,()->service.edit(admin,applicant,new Account("Test","Fixture","admin-fixture@example.invalid",null,1,1,"Duplicate email",null,null)));
        assertFalse(service.detail(admin).containsKey("password"));
        assertEquals(0,db.count("SELECT COUNT(*) FROM admin_audit"));
    }
    @Test void migrationPreservesPasswordWidthAndDoesNotInventHistoricalCurrency() {
        assertEquals(255,((Number)db.one("SELECT CHARACTER_MAXIMUM_LENGTH AS length FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='user' AND column_name='password'").get("length")).intValue());
        assertEquals("LKR",db.one("SELECT COLUMN_DEFAULT AS value FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='payment' AND column_name='currency'").get("value"));
        assertEquals(0,db.count("SELECT COUNT(*) FROM admin_audit"));
        assertEquals(0,db.count("SELECT COUNT(*) FROM admin_email_outbox"));
    }
    @Test void statisticsValidateRangeAndExposeUnknownFinancialSemantics() {
        var statistics=new AdminStatisticsService(new AdminStatisticsRepository(db));
        status(400,()->statistics.report(Instant.parse("2026-01-02T00:00:00Z"),Instant.parse("2026-01-01T00:00:00Z"),null));
        var result=statistics.report(Instant.parse("2026-01-01T00:00:00Z"),Instant.parse("2027-01-01T00:00:00Z"),null);
        assertEquals("Asia/Colombo",result.get("eventTimeZone"));
        assertTrue(result.get("financialNotice").toString().contains("not reconciled revenue"));
    }
    @Test void eventReviewEditAndDisablePreserveLinkedHistoryAndRejectStaleRevisions() {
        int id=eventFixture();
        service.decideEvent(admin,id,new EventDecision(true,0,"Verified event"));
        status(409,()->service.decideEvent(admin,id,new EventDecision(false,0,"Repeated decision")));
        var start=Instant.now().plusSeconds(3600); var end=start.plusSeconds(3600);
        service.editEvent(admin,id,new EventEdit("Updated","Description",start,end,1,"Corrected schedule"));
        assertEquals(1,service.events(2,"UPCOMING",25,0).size());
        status(409,()->service.editEvent(admin,id,new EventEdit("Stale","Description",start,end,1,"Stale update")));
        db.update("INSERT INTO event_dates(`date`,`time`,event_id) VALUES('2027-01-01','09:00',?)",id);
        status(409,()->service.deleteEvent(admin,id,"Cannot erase linked dates"));
        service.disableEvent(admin,id,"Moderation hold"); assertNotNull(service.event(id).get("disabled_at"));
        assertEquals(1,db.count("SELECT COUNT(*) FROM event_dates WHERE event_id=?",id));
    }
    @Test void statisticsKeepUnknownCurrencyAndInvalidAmountsVisible() {
        int event=eventFixture();
        long booking=db.insert("INSERT INTO booking(user_id,event_id,booking_reference,total_amount,created_at) VALUES(?,?,'fixture',12.5,UTC_TIMESTAMP())",applicant,event);
        db.update("INSERT INTO payment(id,payment_method_id,booking_id,amount,created_at,updated_at,p_status_id,currency) VALUES(9001,1,?,'12.50',UTC_TIMESTAMP(),UTC_TIMESTAMP(),2,'LKR'),(9002,1,?,'invalid',UTC_TIMESTAMP(),UTC_TIMESTAMP(),2,NULL)",booking,booking);
        var statistics=new AdminStatisticsService(new AdminStatisticsRepository(db));
        var result=statistics.report(Instant.now().minusSeconds(86400),Instant.now().plusSeconds(60),applicant);
        var amounts=(List<?>)result.get("paymentAmounts");
        assertEquals(2,amounts.size());
        for(Object amount:amounts) {
            var row=(Map<?,?>)amount;
            if("LKR".equals(row.get("currency"))) assertEquals(0,new BigDecimal("12.50").compareTo((BigDecimal)row.get("amount")));
            else { assertEquals("UNKNOWN",row.get("currency")); assertNull(row.get("amount")); assertEquals(1,((Number)row.get("invalid_amounts")).intValue()); }
        }
    }
    @Test void upgradesExistingV3WithoutInventingCurrencyOrEventHistory() {
        var reset=Flyway.configure().dataSource(mysql.getJdbcUrl(),mysql.getUsername(),mysql.getPassword())
            .cleanDisabled(false).target("3").load();
        reset.clean(); reset.migrate();
        applicant=user("legacy-fixture@example.invalid",1);
        int event=eventFixture();
        long booking=db.insert("INSERT INTO booking(user_id,event_id,booking_reference,total_amount,created_at) VALUES(?,?,'legacy',10,UTC_TIMESTAMP())",applicant,event);
        db.update("INSERT INTO payment(id,payment_method_id,booking_id,amount,created_at,updated_at,p_status_id) VALUES(9901,1,?,'10.00',UTC_TIMESTAMP(),UTC_TIMESTAMP(),2)",booking);
        long users=db.count("SELECT COUNT(*) FROM `user`");
        Flyway.configure().dataSource(mysql.getJdbcUrl(),mysql.getUsername(),mysql.getPassword()).load().migrate();
        assertEquals(users,db.count("SELECT COUNT(*) FROM `user`"));
        assertNull(db.one("SELECT currency FROM payment WHERE id=9901").get("currency"));
        var legacy=db.event(event); assertNull(legacy.get("created_at")); assertNull(legacy.get("starts_at"));
        assertEquals(1,db.count("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='university_details'"));
        assertEquals(255,((Number)db.one("SELECT CHARACTER_MAXIMUM_LENGTH AS length FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='user' AND column_name='password'").get("length")).intValue());
    }
    @Test void notificationLeasesAndAttemptsPreventStaleWorkerUpdates() {
        long message=service.contact(new Contact("lease@example.invalid","Question","Please help"));
        service.reply(admin,message,"Reply fixture");
        var outbox=new AdminEmailRepository(db,context.getBean(PlatformTransactionManager.class));
        var first=outbox.claim(); assertNotNull(first); assertNull(outbox.claim());
        long id=((Number)first.get("id")).longValue();
        outbox.failed(id,1);
        db.update("UPDATE admin_email_outbox SET available_at=UTC_TIMESTAMP(6) WHERE id=?",id);
        var second=outbox.claim(); assertEquals(2,((Number)second.get("attempts")).intValue());
        outbox.accepted(id,1,"stale");
        assertEquals("PROCESSING",db.one("SELECT status FROM admin_email_outbox WHERE id=?",id).get("status"));
        outbox.accepted(id,2,"operation-fixture");
        assertEquals("ACCEPTED",db.one("SELECT status FROM admin_email_outbox WHERE id=?",id).get("status"));
        db.update("UPDATE admin_email_outbox SET status='PROCESSING',attempts=5,leased_at=UTC_TIMESTAMP(6)-INTERVAL 11 MINUTE WHERE id=?",id);
        assertNull(outbox.claim());
        assertEquals("FAILED",db.one("SELECT status FROM admin_email_outbox WHERE id=?",id).get("status"));
    }
}
