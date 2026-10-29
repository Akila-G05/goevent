
package com.goevent.gateway.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@Component
public class ResponseCacheGatewayFilterFactory
        extends AbstractGatewayFilterFactory<
        ResponseCacheGatewayFilterFactory.Config> {

    private static final Logger log =
            LoggerFactory.getLogger(
                    ResponseCacheGatewayFilterFactory.class
            );

    public static final String CACHE_KEY_ATTRIBUTE =
            ResponseCacheGatewayFilterFactory.class.getName()
                    + ".cacheKey";

    public static final String CACHE_TTL_ATTRIBUTE =
            ResponseCacheGatewayFilterFactory.class.getName()
                    + ".cacheTtl";

    public static final String CACHE_BYPASS_ATTRIBUTE =
            ResponseCacheGatewayFilterFactory.class.getName()
                    + ".cacheBypass";

    private final ReactiveStringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public ResponseCacheGatewayFilterFactory(
            ReactiveStringRedisTemplate redis,
            ObjectMapper objectMapper) {

        super(Config.class);
        this.redis = redis;
        this.objectMapper = objectMapper;
    }

    public static class Config {

        private long ttlSeconds = 300;
        private String namespace = "goevent";

        public long getTtlSeconds() {
            return ttlSeconds;
        }

        public void setTtlSeconds(long ttlSeconds) {
            this.ttlSeconds = ttlSeconds;
        }

        public String getNamespace() {
            return namespace;
        }

        public void setNamespace(String namespace) {
            this.namespace = namespace;
        }
    }

    public record CachedResponse(
            int status,
            Map<String, List<String>> headers,
            String body) {
    }

    private record DecodedResponse(
            CachedResponse cached,
            byte[] body) {
    }

    @Override
    public GatewayFilter apply(Config config) {

        return (exchange, chain) -> {

            var request = exchange.getRequest();

            // Cache only public GET requests.
            if (!"GET".equalsIgnoreCase(
                    request.getMethod().name())
                    || request.getHeaders().containsKey(
                    HttpHeaders.AUTHORIZATION)
                    || request.getHeaders().containsKey(
                    HttpHeaders.COOKIE)
                    || config.getTtlSeconds() <= 0) {

                return chain.filter(exchange);
            }

            String cacheKey;

            try {
                String source = config.getNamespace()
                        + ":"
                        + request.getURI().getRawPath()
                        + "?"
                        + request.getURI().getRawQuery();

                cacheKey = "gateway:response:"
                        + sha256(source);

            } catch (Exception error) {

                log.error("Could not generate cache key", error);

                return chain.filter(exchange);
            }

            log.info(
                    "Checking response cache for {}",
                    request.getURI()
            );

            log.info("Cache key: {}", cacheKey);

            // Look up the response in Redis.
            return redis.opsForValue()
                    .get(cacheKey)

                    .doOnNext(value ->
                            log.info("Redis returned a cached value")
                    )

                    .onErrorResume(error -> {

                        log.error(
                                "Redis lookup failed",
                                error
                        );

                        // Continue as a cache miss.
                        return Mono.empty();
                    })

                    .flatMap(json ->
                            writeCachedResponse(exchange, json)
                    )

                    .defaultIfEmpty(false)

                    .flatMap(cacheHit -> {

                        if (cacheHit) {

                            log.info(
                                    "CACHE HIT: {}",
                                    cacheKey
                            );

                            return Mono.<Void>empty();
                        }

                        log.info(
                                "CACHE MISS: {}",
                                cacheKey
                        );

                        // The global decorator uses these attributes
                        // when the backend response is written.
                        exchange.getAttributes().put(
                                CACHE_KEY_ATTRIBUTE,
                                cacheKey
                        );

                        exchange.getAttributes().put(
                                CACHE_TTL_ATTRIBUTE,
                                config.getTtlSeconds()
                        );

                        return chain.filter(exchange);
                    });
        };
    }

    private Mono<Boolean> writeCachedResponse(
            ServerWebExchange exchange,
            String json) {

        // Decode the cached response before changing HTTP headers.
        return Mono.fromCallable(() -> {

                    CachedResponse cached =
                            objectMapper.readValue(
                                    json,
                                    CachedResponse.class
                            );

                    byte[] body = Base64.getDecoder()
                            .decode(cached.body());

                    return new DecodedResponse(cached, body);
                })

                .onErrorResume(error -> {

                    log.warn(
                            "Cached value is invalid; treating it as a miss",
                            error
                    );

                    return Mono.empty();
                })

                .flatMap(decoded -> {

                    CachedResponse cached = decoded.cached();
                    byte[] body = decoded.body();

                    var response = exchange.getResponse();

                    // Prevent the global decorator from saving
                    // this cached response a second time.
                    exchange.getAttributes().put(
                            CACHE_BYPASS_ATTRIBUTE,
                            true
                    );

                    response.setStatusCode(
                            HttpStatus.valueOf(cached.status())
                    );

                    cached.headers().forEach((name, values) -> {

                        if (!name.equalsIgnoreCase(
                                HttpHeaders.CONTENT_LENGTH)
                                && !name.equalsIgnoreCase(
                                HttpHeaders.TRANSFER_ENCODING)) {

                            response.getHeaders().put(
                                    name,
                                    values
                            );
                        }
                    });

                    response.getHeaders().remove(
                            HttpHeaders.TRANSFER_ENCODING
                    );

                    response.getHeaders().setContentLength(
                            body.length
                    );

                    log.info("Writing cached response to client");

                    return response.writeWith(
                            Mono.just(
                                    response.bufferFactory().wrap(body)
                            )
                    ).thenReturn(true);
                });
    }

    private String sha256(String value) throws Exception {

        byte[] hash = MessageDigest.getInstance("SHA-256")
                .digest(
                        value.getBytes(StandardCharsets.UTF_8)
                );

        return HexFormat.of().formatHex(hash);
    }
}
