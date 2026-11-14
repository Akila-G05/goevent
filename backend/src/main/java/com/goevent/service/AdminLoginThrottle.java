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

@Service
public class AdminLoginThrottle {
    private static final DefaultRedisScript<Long> COUNT = new DefaultRedisScript<>(
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],900) end; return n", Long.class);
    private final StringRedisTemplate redis;
    public AdminLoginThrottle(StringRedisTemplate redis) { this.redis = redis; }
    public void check(String email, String peer) {
        // No forwarded-header trust and no plaintext account identifiers in Redis.
        try {
            Long address = redis.execute(COUNT, List.of("goevent:admin-login:peer:" + digest(peer)));
            if (address == null) throw new IllegalStateException("Missing counter");
            if (address > 50)
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Try again later");
            Long account = redis.execute(COUNT, List.of("goevent:admin-login:email:" + digest(email)));
            if (account == null) throw new IllegalStateException("Missing counter");
            if (account > 10)
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Try again later");
        } catch (ResponseStatusException error) {
            throw error;
        } catch (RuntimeException error) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Login temporarily unavailable");
        }
    }
    public void checkContact(String peer) {
        try {
            Long count=redis.execute(COUNT,List.of("goevent:admin-login:contact:"+digest(peer)));
            if(count==null) throw new IllegalStateException("Missing counter");
            if(count>5) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Try again later");
        } catch(ResponseStatusException error) { throw error; }
        catch(RuntimeException error) { throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Contact temporarily unavailable"); }
    }
    private String digest(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
    }
}
