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
    @Import({AdminSecurityConfig.class, CorsConfig.class, ApiPrefixConfig.class, AdminAuthenticationController.class,
        com.goevent.controller.EventController.class, com.goevent.controller.AuthenticationController.class, com.goevent.controller.UserController.class,
        AdminController.class,CoordinatorRequestController.class,ContactController.class,com.goevent.controller.CoordinatorController.class})
    static class Config {
        @Bean com.goevent.service.CoordinatorService coordinator(){return mock(com.goevent.service.CoordinatorService.class);}
        @Bean com.goevent.service.ImageUploadService images(){return mock(com.goevent.service.ImageUploadService.class);}
        @Bean com.goevent.service.AuthenticationService authentication() { return mock(com.goevent.service.AuthenticationService.class); }
        @Bean com.goevent.service.UserService users() { return mock(com.goevent.service.UserService.class); }
        @Bean com.goevent.service.EventService events() { return mock(com.goevent.service.EventService.class); }
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
    @Test void coordinatorRequiresCurrentOrdinarySessionAndCsrf() throws Exception {
        mvc.perform(get("/api/coordinator/eligibility")).andExpect(status().isUnauthorized());
        var session=new MockHttpSession();session.setAttribute("userId",7);
        when(context.getBean(AdminAccessRepository.class).isActiveUser(7)).thenReturn(true,false);
        when(context.getBean(com.goevent.service.CoordinatorService.class).workspaces(7)).thenReturn(List.of());
        mvc.perform(get("/api/coordinator/eligibility").session(session)).andExpect(status().isOk());
        mvc.perform(post("/api/coordinator/applications").session(session).contentType("application/json").content("{}"))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/coordinator/eligibility").session(session)).andExpect(status().isUnauthorized());
        Assertions.assertTrue(session.isInvalid());
        verify(context.getBean(com.goevent.service.CoordinatorService.class),never()).apply(anyInt(),any());
    }
    @Test void publicContactCannotBeSubmittedWithoutCsrf() throws Exception {
        mvc.perform(get("/api/contact/csrf")).andExpect(status().isOk());
        mvc.perform(post("/api/contact").contentType("application/json").content("{}"))
            .andExpect(status().isForbidden());
        verifyNoInteractions(context.getBean(AdminLoginThrottle.class));
    }
    @Test void userModeCannotReadAdminDataAndReturnRequiresCsrfAndFreshRole() throws Exception {
        var session=new MockHttpSession();session.setAttribute("userId",7);session.setAttribute("adminUserModeId",7);
        when(context.getBean(AdminAccessRepository.class).isActiveAdmin(7)).thenReturn(true);
        mvc.perform(get("/api/admin/accounts").session(session)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/auth/switch-to-admin").session(session)).andExpect(status().isForbidden());
        var result=mvc.perform(get("/api/admin/auth/csrf").session(session)).andReturn();
        var token=JsonParser.parseString(result.getResponse().getContentAsString()).getAsJsonObject();
        mvc.perform(post("/api/admin/auth/switch-to-admin").session(session)
            .header(token.get("headerName").getAsString(),token.get("token").getAsString()))
            .andExpect(status().isOk());
        verify(context.getBean(AdminAuthenticationService.class)).switchMode(any(),eq(true));
        when(context.getBean(AdminAccessRepository.class).isActiveAdmin(7)).thenReturn(false);
        mvc.perform(post("/api/admin/auth/switch-to-admin").session(session)
            .header(token.get("headerName").getAsString(),token.get("token").getAsString()))
            .andExpect(status().isUnauthorized());
        Assertions.assertTrue(session.isInvalid());
    }
    @Test void ordinaryAdminRoleAttributeCannotUseReturnEndpoint() throws Exception {
        var session=new MockHttpSession();session.setAttribute("userId",7);session.setAttribute("role","ADMIN");
        var result=mvc.perform(get("/api/admin/auth/csrf").session(session)).andReturn();
        var token=JsonParser.parseString(result.getResponse().getContentAsString()).getAsJsonObject();
        mvc.perform(post("/api/admin/auth/switch-to-admin").session(session)
            .header(token.get("headerName").getAsString(),token.get("token").getAsString()))
            .andExpect(status().isUnauthorized());
        verifyNoInteractions(context.getBean(AdminAuthenticationService.class));
    }
    private com.google.gson.JsonObject token(MockHttpSession session) throws Exception {
        var result = mvc.perform(get("/api/auth/csrf").session(session))
            .andExpect(status().isOk()).andReturn();
        return JsonParser.parseString(result.getResponse().getContentAsString()).getAsJsonObject();
    }
    @Test void legacyMutationsRejectMissingInvalidTokensAndUntrustedOrigins() throws Exception {
        for (String path : List.of("manual", "google", "register", "logout")) {
            mvc.perform(post("/api/auth/"+path).contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
            mvc.perform(post("/api/auth/"+path).header("X-CSRF-TOKEN", "invalid")
                .contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
        }
        var session = new MockHttpSession(); var csrf = token(session);
        mvc.perform(post("/api/auth/manual").session(session).header("Origin", "https://untrusted.invalid")
            .header("X-CSRF-TOKEN", csrf.get("token").getAsString())
            .contentType("application/json").content("{}"))
            .andExpect(status().isForbidden());
        verifyNoInteractions(context.getBean(com.goevent.service.AuthenticationService.class));
    }
    @Test void loginRotationRejectsOldTokenAndLogoutWorksWithFreshToken() throws Exception {
        var service = context.getBean(com.goevent.service.AuthenticationService.class);
        when(service.handleManualAuthentication(anyMap(), any())).thenAnswer(call -> {
            jakarta.servlet.http.HttpServletRequest request = call.getArgument(1);
            request.getSession(false).invalidate(); request.getSession(true).setAttribute("userId",7);
            return "{\"status\":true}";
        });
        when(service.handleLogout(any())).thenAnswer(call -> {
            jakarta.servlet.http.HttpServletRequest request = call.getArgument(0);
            request.getSession(false).invalidate(); return "{\"status\":true}";
        });
        var before = new MockHttpSession(); var old = token(before);
        var login = mvc.perform(post("/api/auth/manual").session(before)
            .header("X-CSRF-TOKEN",old.get("token").getAsString())
            .contentType("application/json").content("{}"))
            .andExpect(status().isOk()).andReturn();
        Assertions.assertTrue(before.isInvalid());
        var after = (MockHttpSession)login.getRequest().getSession(false);
        mvc.perform(post("/api/auth/logout").session(after)
            .header("X-CSRF-TOKEN",old.get("token").getAsString())).andExpect(status().isForbidden());
        var fresh = token(after);
        mvc.perform(post("/api/auth/logout").session(after)
            .header("X-CSRF-TOKEN",fresh.get("token").getAsString())).andExpect(status().isOk());
        Assertions.assertTrue(after.isInvalid());
        verify(service,times(1)).handleLogout(any());
    }
    @Test void googleAndRegistrationAcceptCsrfWithoutPriorLogin() throws Exception {
        for (String path : List.of("google","register")) {
            var session = new MockHttpSession(); var csrf = token(session);
            mvc.perform(post("/api/auth/"+path).session(session)
                .header("X-CSRF-TOKEN",csrf.get("token").getAsString())
                .contentType("application/json").content("{}"))
                .andExpect(status().isOk());
        }
        var service = context.getBean(com.goevent.service.AuthenticationService.class);
        verify(service).handleGoogleAuthentication(anyMap(),any());
        verify(service).handleManualRegistration(anyMap(),any());
    }
    @Test void profileJsonAndMultipartRequireActiveUserAndCsrf() throws Exception {
        var session = new MockHttpSession(); session.setAttribute("userId",7);
        var access = context.getBean(AdminAccessRepository.class);
        when(access.isActiveUser(7)).thenReturn(true);
        var csrf = token(session); String value = csrf.get("token").getAsString();
        mvc.perform(put("/api/user/data").session(session).contentType("application/json").content("{}"))
            .andExpect(status().isForbidden());
        var file = new MockMultipartFile("file","avatar.png","image/png",new byte[]{1});
        mvc.perform(multipart("/api/user/image").file(file).session(session)).andExpect(status().isForbidden());
        verifyNoInteractions(context.getBean(com.goevent.service.UserService.class));
        mvc.perform(put("/api/user/data").session(session).header("X-CSRF-TOKEN",value)
            .contentType("application/json").content("{}")) .andExpect(status().isOk());
        mvc.perform(multipart("/api/user/image").file(file).session(session).header("X-CSRF-TOKEN",value))
            .andExpect(status().isOk());
        mvc.perform(get("/api/user/data")).andExpect(status().isUnauthorized());
        when(access.isActiveUser(7)).thenReturn(false);
        mvc.perform(put("/api/user/data").session(session).header("X-CSRF-TOKEN",value)
            .contentType("application/json").content("{}")) .andExpect(status().isUnauthorized());
        Assertions.assertTrue(session.isInvalid());
        verify(context.getBean(com.goevent.service.UserService.class),times(1)).updateCurrentUserData(anyString(),any());
        verify(context.getBean(com.goevent.service.UserService.class),times(1)).uploadProfileImage(any(),any());
    }

    @Test void directEventWritesAndSavedActionsRequireCsrfAndCurrentLogin() throws Exception {
        mvc.perform(get("/api/events")).andExpect(status().isOk());
        mvc.perform(get("/api/events/mine")).andExpect(status().isUnauthorized());
        var session=new MockHttpSession();session.setAttribute("userId",7);
        when(context.getBean(AdminAccessRepository.class).isActiveUser(7)).thenReturn(true);
        var service=context.getBean(com.goevent.service.EventService.class);
        mvc.perform(post("/api/events").session(session).contentType("application/json").content("{}"))
            .andExpect(status().isForbidden());
        mvc.perform(delete("/api/events/1/save").session(session)).andExpect(status().isForbidden());
        mvc.perform(multipart("/api/events/1/image").file(new MockMultipartFile("file",new byte[]{1})).session(session))
            .andExpect(status().isForbidden());
        verify(service,never()).create(any(),any());verify(service,never()).unsave(anyLong(),any());
        var csrf=token(session);
        mvc.perform(post("/api/events").session(session).header("X-CSRF-TOKEN",csrf.get("token").getAsString())
            .contentType("application/json").content("{}")) .andExpect(status().isOk());
        verify(service).create(any(),any());
        when(context.getBean(AdminAccessRepository.class).isActiveUser(7)).thenReturn(false);
        mvc.perform(get("/api/events/mine").session(session)).andExpect(status().isUnauthorized());
    }

}
