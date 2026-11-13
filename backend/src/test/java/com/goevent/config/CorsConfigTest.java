package com.goevent.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import static org.junit.jupiter.api.Assertions.*;

class CorsConfigTest {
    @Test void permitsOnlyApprovedCredentialedOrigins() throws Exception {
        var filter = new CorsConfig("https://events.example.com", true).corsFilter();
        var allowed = new MockHttpServletRequest("OPTIONS", "/goevent/api/auth/google");
        allowed.addHeader("Origin", "https://events.example.com");
        allowed.addHeader("Access-Control-Request-Method", "POST");
        var response = new MockHttpServletResponse();
        filter.doFilter(allowed, response, (request, result) -> fail("Preflight should terminate"));
        assertEquals("https://events.example.com", response.getHeader("Access-Control-Allow-Origin"));
        assertEquals("true", response.getHeader("Access-Control-Allow-Credentials"));
        allowed.removeHeader("Origin");
        allowed.addHeader("Origin", "https://attacker.example.com");
        response = new MockHttpServletResponse();
        filter.doFilter(allowed, response, (request, result) -> fail("Untrusted origin passed"));
        assertEquals(403, response.getStatus());
    }
    @Test void rejectsWildcardsAndNonOrigins() {
        for (String origin : new String[]{"*", "", "http://events.example.com", "https://example.com/path", "https://user@example.com"}) {
            assertThrows(IllegalArgumentException.class, () -> new CorsConfig(origin, true));
        }
    }
}
