package com.goevent.config;

import com.goevent.controller.AuthenticationController;
import com.goevent.service.AuthenticationService;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.mock.web.*;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SecurityConfigTest {
    @Configuration @EnableWebMvc @EnableWebSecurity
    @Import({SecurityConfig.class, ApiPrefixConfig.class, AuthenticationController.class})
    static class Config {
        @Bean AuthenticationService authentication() {
            AuthenticationService service = mock(AuthenticationService.class);
            when(service.handleManualAuthentication(any(), any())).thenReturn("{}");
            when(service.handleSessionCheck(any())).thenReturn("{}");
            return service;
        }
    }

    private AnnotationConfigWebApplicationContext context;
    private MockMvc mvc;

    @BeforeEach void setup() {
        context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        context.register(Config.class);
        context.refresh();
        mvc = MockMvcBuilders.webAppContextSetup(context)
            .addFilters(context.getBean("springSecurityFilterChain", Filter.class)).build();
    }

    @AfterEach void close() { context.close(); }

    @Test void userEndpointsStayOpenWithoutCsrfToken() throws Exception {
        mvc.perform(post("/api/auth/manual").contentType("application/json").content("{}"))
            .andExpect(status().isOk());
        mvc.perform(get("/api/auth/session")).andExpect(status().isOk());
    }
}
