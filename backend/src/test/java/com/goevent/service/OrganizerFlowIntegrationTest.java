package com.goevent.service;

import com.goevent.config.FileStorageConfig.StorageSettings;
import com.goevent.dto.EventDTO;
import com.goevent.enums.Role;
import com.goevent.exception.EventException;
import com.goevent.repository.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.mysql.MySQLContainer;
import java.nio.file.Path;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@Testcontainers
class OrganizerFlowIntegrationTest {
    @Container static MySQLContainer mysql = new MySQLContainer("mysql:8.4")
        .withTmpFs(Map.of("/var/lib/mysql","rw,size=1g"))
        .withDatabaseName("organizer_test").withUsername("organizer_fixture").withPassword("disposable-test-password");
    @Configuration @EnableTransactionManagement
    static class Config {
        @Bean javax.sql.DataSource source() { return new DriverManagerDataSource(mysql.getJdbcUrl(),mysql.getUsername(),mysql.getPassword()); }
        @Bean JdbcTemplate jdbc(javax.sql.DataSource source) { return new JdbcTemplate(source); }
        @Bean PlatformTransactionManager manager(javax.sql.DataSource source) { return new DataSourceTransactionManager(source); }
        @Bean AuthenticationRepo users(JdbcTemplate jdbc) { return spy(new AuthenticationRepo(jdbc)); }
        @Bean RegistrationService registration(AuthenticationRepo users) { return new RegistrationService(users); }
        @Bean EventRepo events(JdbcTemplate jdbc) { return new EventRepo(jdbc); }
        @Bean EventService service(EventRepo events) {
            return new EventService(events,new ImageUploadService(new StorageSettings(Path.of(System.getProperty("java.io.tmpdir"),"unused-organizer-fixture"),"/goevent/api/images")),mock(MapLinkResolver.class));
        }
    }
    AnnotationConfigApplicationContext context;
    JdbcTemplate jdbc;
    RegistrationService registrations;
    EventService events;
    @BeforeEach void setup() {
        var flyway=Flyway.configure().dataSource(mysql.getJdbcUrl(),mysql.getUsername(),mysql.getPassword()).cleanDisabled(false).load();
        flyway.clean(); flyway.migrate();
        context=new AnnotationConfigApplicationContext(Config.class);
        jdbc=context.getBean(JdbcTemplate.class); registrations=context.getBean(RegistrationService.class); events=context.getBean(EventService.class);
    }
    @AfterEach void close() { context.close(); }
    int organization() { return jdbc.queryForObject("SELECT id FROM organization ORDER BY id LIMIT 1",Integer.class); }
    RegistrationService.Input input(String email,Role role,Integer org) {
        return new RegistrationService.Input("Test","Organizer",email,new BCryptPasswordEncoder(4).encode("fixture-pass"),null,null,role,org,"Chair");
    }
    MockHttpServletRequest session(int id) { var r=new MockHttpServletRequest();r.getSession().setAttribute("userId",id);return r; }
    EventDTO payload(int revision) {
        var input=new EventDTO();input.setName("Direct publication");input.setRevision(revision);input.setEventLevelId(1);
        input.setCategoryId(jdbc.queryForObject("SELECT id FROM category ORDER BY id LIMIT 1",Integer.class));
        input.setAudienceId(jdbc.queryForObject("SELECT id FROM audience ORDER BY id LIMIT 1",Integer.class));
        var venue=new EventDTO.Venue();venue.setName("Venue");venue.setCity("Colombo");input.setVenue(venue);
        var date=new EventDTO.EventDate();date.setDate("2030-06-15");date.setStartTime("10:00");date.setEndTime("12:00");input.setDates(List.of(date));
        input.setLinks(List.of());input.setTags(List.of());return input;
    }
    @Test void manualSignupPublishesImmediatelyWithOwnershipAndStaleEditChecks() {
        var auth=new AuthenticationService(context.getBean(AuthenticationRepo.class),new BCryptPasswordEncoder(4),registrations);
        var body=new HashMap<>(Map.of("fname","Test","lname","Organizer","email","organizer@example.invalid","password","fixture-pass","confirmPassword","fixture-pass","roleId","2","orgId",Integer.toString(organization()),"position","Chair"));
        var registered=com.google.gson.JsonParser.parseString(auth.handleManualRegistration(body,new MockHttpServletRequest())).getAsJsonObject();
        assertTrue(registered.get("status").getAsBoolean());assertEquals("REGISTERED",registered.get("action").getAsString());
        int id=registered.get("userId").getAsInt();
        assertEquals(1,jdbc.queryForObject("SELECT user_status_id FROM `user` WHERE id=?",Integer.class,id));
        assertEquals("APPROVED",jdbc.queryForObject("SELECT access_state FROM user_has_organize WHERE user_id=?",String.class,id));
        long event=events.create(payload(0),session(id));
        assertEquals(2,jdbc.queryForObject("SELECT event_status_id FROM `event` WHERE id=?",Integer.class,event));
        assertNull(jdbc.queryForObject("SELECT aproved_by FROM `event` WHERE id=?",Integer.class,event));
        assertEquals(event,events.detail(event).id());
        int other=registrations.register(input("other@example.invalid",Role.ORGANIZER,organization())).getId();
        assertThrows(EventException.class,()->events.update(event,payload(0),session(other)));
        assertEquals(event,events.update(event,payload(0),session(id)));
        assertEquals(1,events.ownerDetail(event,session(id)).revision());
        assertThrows(EventException.class,()->events.update(event,payload(0),session(id)));
        jdbc.update("UPDATE `user` SET user_status_id=2 WHERE id=?",id);
        assertThrows(EventException.class,()->events.create(payload(0),session(id)));
        assertThrows(EventException.class,()->events.save(event,session(id)));
    }
    @Test void badOrganizationAndDuplicateRegistrationsLeaveNoPartialAccount() {
        assertThrows(IllegalArgumentException.class,()->registrations.register(input("bad@example.invalid",Role.ORGANIZER,Integer.MAX_VALUE)));
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM `user` WHERE email='bad@example.invalid'",Integer.class));
        registrations.register(input("same@example.invalid",Role.USER,null));
        assertThrows(RuntimeException.class,()->registrations.register(input("same@example.invalid",Role.ORGANIZER,organization())));
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM `user` WHERE email='same@example.invalid'",Integer.class));
        int user=registrations.register(input("attendee@example.invalid",Role.USER,null)).getId();
        assertThrows(EventException.class,()->events.create(payload(0),session(user)));
    }
    @Test void organizationWriteFailureRollsBackTheNewAccount() {
        var users=context.getBean(AuthenticationRepo.class);
        doThrow(new IllegalStateException("fixture organization write failure")).when(users).registerOrganizerData(anyInt(),anyInt(),anyString());
        assertThrows(IllegalStateException.class,()->registrations.register(input("rollback@example.invalid",Role.ORGANIZER,organization())));
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM `user` WHERE email='rollback@example.invalid'",Integer.class));
    }

    @Test void upgradingV5BackfillsLegacyLinksAndPreservesBookings() {
        var old=Flyway.configure().dataSource(mysql.getJdbcUrl(),mysql.getUsername(),mysql.getPassword()).cleanDisabled(false).target("5").load();
        old.clean();old.migrate();
        int owner=registrations.register(input("legacy@example.invalid",Role.ORGANIZER,organization())).getId();
        jdbc.update("INSERT INTO venue(name,city) VALUES('Legacy venue','Colombo')");
        int venue=jdbc.queryForObject("SELECT MAX(id) FROM venue",Integer.class);
        jdbc.update("INSERT INTO img(path) VALUES('legacy.png')");
        int image=jdbc.queryForObject("SELECT MAX(id) FROM img",Integer.class);
        jdbc.update("INSERT INTO link(link_name,link) VALUES('Legacy link','https://example.invalid')");
        int link=jdbc.queryForObject("SELECT MAX(id) FROM link",Integer.class);
        jdbc.update("INSERT INTO `event`(name,category_id,venue_id,event_status_id,audience_id,event_level_id,img_id,link_id,published_by,aproved_by) VALUES('Legacy',1,?,2,1,1,?,?,?,NULL)",venue,image,link,owner);
        int event=jdbc.queryForObject("SELECT MAX(id) FROM `event`",Integer.class);
        jdbc.update("INSERT INTO booking(user_id,event_id,booking_reference,total_amount) VALUES(?,?,'legacy-booking',100)",owner,event);
        Flyway.configure().dataSource(mysql.getJdbcUrl(),mysql.getUsername(),mysql.getPassword()).load().migrate();
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM event_has_links WHERE event_id=? AND link_id=?",Integer.class,event,link));
        assertEquals(100,jdbc.queryForObject("SELECT total_amount FROM booking WHERE booking_reference='legacy-booking'",Double.class).intValue());
        assertThrows(EventException.class,()->events.update(event,payload(0),session(owner)));
    }

}
