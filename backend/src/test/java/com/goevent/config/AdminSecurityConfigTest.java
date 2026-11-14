package com.goevent.config;

import com.goevent.controller.AdminAuthenticationController;
import com.goevent.repository.AdminAccessRepository;
import com.goevent.service.AdminAuthenticationService;
import com.goevent.service.AdminManagementService;
import com.goevent.service.AdminStatisticsService;
import com.goevent.service.AdminLoginThrottle;
import com.goevent.controller.AdminController;
import com.goevent.controller.CoordinatorRequestController;
import com.goevent.controller.ContactController;
import com.google.gson.JsonParser;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.mock.web.*;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.List;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AdminSecurityConfigTest {
    @Configuration @EnableWebMvc @EnableWebSecurity
    @Import({AdminSecurityConfig.class, ApiPrefixConfig.class, AdminAuthenticationController.class,
        AdminController.class,CoordinatorRequestController.class,ContactController.class})
    static class Config {
        @Bean AdminAccessRepository access() { return mock(AdminAccessRepository.class); }
        @Bean AdminAuthenticationService service() { return mock(AdminAuthenticationService.class); }
        @Bean AdminManagementService management() { return mock(AdminManagementService.class); }
        @Bean AdminStatisticsService statistics() { return mock(AdminStatisticsService.class); }
        @Bean AdminLoginThrottle throttle() { return mock(AdminLoginThrottle.class); }
    }
    private AnnotationConfigWebApplicationContext context;
    private MockMvc mvc;
    @BeforeEach void setup() {
        context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext()); context.register(Config.class); context.refresh();
        mvc = MockMvcBuilders.webAppContextSetup(context)
            .addFilters(context.getBean("springSecurityFilterChain", Filter.class)).build();
    }
    @AfterEach void close() { context.close(); }
    @Test void anonymousAndOrdinaryUserCannotReadAdminSession() throws Exception {
        mvc.perform(get("/api/admin/auth/session")).andExpect(status().isUnauthorized());
        var session = new MockHttpSession(); session.setAttribute("userId",7); session.setAttribute("role","ADMIN");
        session.setAttribute("SPRING_SECURITY_CONTEXT", new SecurityContextImpl(
            new UsernamePasswordAuthenticationToken(7, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))));
        mvc.perform(get("/api/admin/auth/session").session(session)).andExpect(status().isUnauthorized());
    }
    @Test void rechecksPrivilegesOnEveryRequest() throws Exception {
        var access = context.getBean(AdminAccessRepository.class);
        when(access.isActiveAdmin(7)).thenReturn(true, false);
        var session = new MockHttpSession(); session.setAttribute("adminUserId",7);
        mvc.perform(get("/api/admin/auth/session").session(session)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/auth/session").session(session)).andExpect(status().isUnauthorized());
        Assertions.assertTrue(session.isInvalid());
    }
    @Test void csrfIsRequiredForLoginAndLogoutAndValidLogoutInvalidatesSession() throws Exception {
        mvc.perform(post("/api/admin/auth/login").contentType("application/json").content("{}"))
            .andExpect(status().isForbidden());
        verifyNoInteractions(context.getBean(AdminAuthenticationService.class));
        var session = new MockHttpSession(); session.setAttribute("adminUserId",7);
        when(context.getBean(AdminAccessRepository.class).isActiveAdmin(7)).thenReturn(true);
        mvc.perform(post("/api/admin/auth/logout").session(session)).andExpect(status().isForbidden());
        var result = mvc.perform(get("/api/admin/auth/csrf").session(session)).andExpect(status().isOk()).andReturn();
        var token = JsonParser.parseString(result.getResponse().getContentAsString()).getAsJsonObject();
        mvc.perform(post("/api/admin/auth/logout").session(session)
            .header(token.get("headerName").getAsString(), token.get("token").getAsString()))
            .andExpect(status().isOk());
        Assertions.assertTrue(session.isInvalid());
    }
    @Test void memberCanReadOwnRequestsButCannotReadAdminAccounts() throws Exception {
        var session=new MockHttpSession(); session.setAttribute("userId",7);
        when(context.getBean(AdminAccessRepository.class).isActiveUser(7)).thenReturn(true);
        when(context.getBean(AdminManagementService.class).ownRequests(7)).thenReturn(List.of());
        mvc.perform(get("/api/coordinator-requests").session(session)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/accounts").session(session)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/coordinator-requests").session(session).contentType("application/json").content("{}"))
            .andExpect(status().isForbidden());
        verify(context.getBean(AdminManagementService.class),never()).requestCoordinator(anyInt(),any());
    }
    @Test void publicContactCannotBeSubmittedWithoutCsrf() throws Exception {
        mvc.perform(get("/api/contact/csrf")).andExpect(status().isOk());
        mvc.perform(post("/api/contact").contentType("application/json").content("{}"))
            .andExpect(status().isForbidden());
        verifyNoInteractions(context.getBean(AdminLoginThrottle.class));
    }
}
