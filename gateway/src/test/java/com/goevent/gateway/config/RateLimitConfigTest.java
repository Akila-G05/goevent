package com.goevent.gateway.config;

import java.net.InetSocketAddress;
import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import static org.junit.jupiter.api.Assertions.*;

class RateLimitConfigTest {
    private MockServerWebExchange request(String peer, String forwarded) {
        return MockServerWebExchange.from(MockServerHttpRequest.get("/goevent/api/test")
                .remoteAddress(new InetSocketAddress(peer, 12345)).header("X-Forwarded-For", forwarded));
    }
    @Test void trustsOnlyTheConfiguredProxyAndOneNumericAddress() {
        var resolver = new RateLimitConfig().ipKeyResolver("172.29.240.2");
        assertEquals("203.0.113.7", resolver.resolve(request("172.29.240.2", "203.0.113.7")).block());
        assertEquals("192.0.2.8", resolver.resolve(request("192.0.2.8", "203.0.113.7")).block());
        assertNull(resolver.resolve(request("172.29.240.2", "203.0.113.7, 192.0.2.9")).block());
        assertNull(resolver.resolve(request("172.29.240.2", "attacker.example.com")).block());
    }
    @Test void productionCorsRejectsHttpAndWildcards() {
        for (String origin : new String[]{"*", "http://example.com", "https://example.com/path"}) {
            assertThrows(IllegalArgumentException.class, () -> new CorsConfig(origin, true));
        }
        assertNotNull(new CorsConfig("https://events.example.com", true).corsWebFilter());
    }
}
