package com.goevent.gateway.config;

import java.net.InetAddress;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

@Configuration
public class RateLimitConfig {
    @Bean
    public KeyResolver ipKeyResolver(@Value("${app.proxy.trusted-addresses:}") String configured) {
        Set<String> trusted = Arrays.stream(configured.split(",")).map(String::trim)
                .filter(value -> !value.isEmpty()).collect(Collectors.toUnmodifiableSet());
        return exchange -> {
            var peer = exchange.getRequest().getRemoteAddress();
            if (peer == null || peer.getAddress() == null) {
                return Mono.empty();
            }
            String address = peer.getAddress().getHostAddress();
            if (!trusted.contains(address)) {
                return Mono.just(address); // Never trust forwarding headers from arbitrary peers.
            }
            String forwarded = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
            try {
                // Caddy overwrites this header with one numeric socket address.
                if (forwarded == null || !forwarded.matches("[0-9a-fA-F:.]+")) {
                    return Mono.empty();
                }
                return Mono.just(InetAddress.getByName(forwarded).getHostAddress());
            } catch (java.net.UnknownHostException exception) {
                return Mono.empty();
            }
        };
    }

    @Bean
    public RedisRateLimiter redisRateLimiter() {
        return new RedisRateLimiter(2, 5) {
            @Override
            public Mono<Response> isAllowed(String routeId, String id) {
                // Upstream reports Redis failures as allowed=true, remaining=-1.
                // Missing headers also fail closed rather than weakening this check.
                return super.isAllowed(routeId, id).flatMap(response -> {
                    String remaining = response.getHeaders().get(getRemainingHeader());
                    if (remaining == null || Long.parseLong(remaining) < 0) {
                        return Mono.error(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                                "Rate limiter unavailable"));
                    }
                    return Mono.just(response);
                });
            }
        };
    }
}
