package com.goevent.gateway.controller;

import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/gateway/cache")
public class CacheController {

    private final ReactiveStringRedisTemplate redisTemplate;

    public CacheController(ReactiveStringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @DeleteMapping("/clear")
    public Mono<ResponseEntity<String>> clearCache() {

        return redisTemplate.keys("gateway:response:*")
            .flatMap(redisTemplate::delete)
            .reduce(0L, Long::sum)
            .map(deleted -> ResponseEntity.ok(
                    "Deleted " + deleted + " cache entries"
            ));
    }
}