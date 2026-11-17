package com.goevent.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

/** Limits how often one client address can submit the public contact form. */
@Service
public class ContactThrottle {

    private static final DefaultRedisScript<Long> COUNT = new DefaultRedisScript<>(
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],900) end; return n", Long.class);

    private final StringRedisTemplate redis;

    public ContactThrottle(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public void checkContact(String peer) {
        try {
            Long count = redis.execute(COUNT, List.of("goevent:contact:peer:" + digest(peer)));
            if (count == null) throw new IllegalStateException("Missing counter");
            if (count > 5) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Try again later");
        } catch (ResponseStatusException error) {
            throw error;
        } catch (RuntimeException error) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Contact temporarily unavailable");
        }
    }

    private String digest(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException(error);
        }
    }
}
