package com.goevent.service;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminLoginThrottleTest {
    @Test void permitsRequestsBelowBothLimits() {
        var redis = mock(StringRedisTemplate.class);
        when(redis.execute(any(RedisScript.class), anyList())).thenReturn(1L, 1L);
        new AdminLoginThrottle(redis).check("admin@example.invalid", "127.0.0.1");
        verify(redis, times(2)).execute(any(RedisScript.class), anyList());
    }
    @Test void enforcesAccountAndPeerLimits() {
        for (long[] counts : new long[][]{{1,11},{51,1}}) {
            var redis = mock(StringRedisTemplate.class);
            when(redis.execute(any(RedisScript.class), anyList())).thenReturn(counts[0], counts[1]);
            var error = assertThrows(ResponseStatusException.class,
                () -> new AdminLoginThrottle(redis).check("admin@example.invalid", "127.0.0.1"));
            assertEquals(429, error.getStatusCode().value());
        }
    }
    @Test void redisFailureNeverAllowsLogin() {
        var redis = mock(StringRedisTemplate.class);
        when(redis.execute(any(RedisScript.class), anyList())).thenThrow(new IllegalStateException("Redis unavailable"));
        var error = assertThrows(ResponseStatusException.class,
            () -> new AdminLoginThrottle(redis).check("admin@example.invalid", "127.0.0.1"));
        assertEquals(503, error.getStatusCode().value());
    }
}
