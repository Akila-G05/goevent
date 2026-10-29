package com.goevent.gateway.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpResponseDecorator;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class ResponseCacheGatewayFilterFactory
        extends AbstractGatewayFilterFactory<ResponseCacheGatewayFilterFactory.Config> {

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

    private record CachedResponse(
            int status,
            Map<String, List<String>> headers,
            String body) {
    }

    @Override
    public GatewayFilter apply(Config config) {

        return (exchange, chain) -> {

            var request = exchange.getRequest();

            // Cache only public GET requests.
            if (!"GET".equalsIgnoreCase(request.getMethod().name())
                    || request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)
                    || request.getHeaders().containsKey(HttpHeaders.COOKIE)
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

                cacheKey = "gateway:response:" + sha256(source);

            } catch (Exception ex) {
                return chain.filter(exchange);
            }

            String finalCacheKey = cacheKey;

            // Check Redis for a cached response.
        return redis.opsForValue()
            .get(finalCacheKey)
            .flatMap(json ->
                writeCachedResponse(exchange, json)
                    .flatMap(cacheHit -> {

                                if (cacheHit) {
                                    return Mono.<Void>empty();
                                }

                                return forwardAndCache(
                                        exchange,
                                        chain,
                                        finalCacheKey,
                                        config
                                );
                            })
            )
            .switchIfEmpty(Mono.defer(() ->
                forwardAndCache(
                        exchange,
                        chain,
                        finalCacheKey,
                        config
                )
            ))
            .onErrorResume(error ->
                forwardAndCache(
                        exchange,
                        chain,
                        finalCacheKey,
                        config
                )
            );
        };
    }

    private Mono<Boolean> writeCachedResponse(
            ServerWebExchange exchange,
            String json) {

        return Mono.fromCallable(() -> objectMapper.readValue(json, CachedResponse.class))
            .flatMap(cached -> {

                var response = exchange.getResponse();

                try {
                    byte[] body = Base64.getDecoder()
                            .decode(cached.body());

                    response.setStatusCode(
                            HttpStatus.valueOf(cached.status()));

                    cached.headers().forEach((name, values) -> response.getHeaders().put(name, values));

                    response.getHeaders()
                            .remove(HttpHeaders.TRANSFER_ENCODING);

                    response.getHeaders()
                            .setContentLength(body.length);

                    return response.writeWith(
                                    Mono.just(
                                            response.bufferFactory()
                                                    .wrap(body)))
                            .thenReturn(true);

                } catch (Exception ex) {
                    return Mono.just(false);
                }
            }).onErrorResume(error -> Mono.just(false));
    }

    private Mono<Void> forwardAndCache(
            ServerWebExchange exchange,
            org.springframework.cloud.gateway.filter.GatewayFilterChain chain,
            String cacheKey,
            Config config) {

        ServerHttpResponseDecorator decorated = new ServerHttpResponseDecorator(exchange.getResponse()) {

            @Override
            public Mono<Void> writeWith(org.reactivestreams.Publisher<? extends DataBuffer> body) {
                return DataBufferUtils.join(Flux.from(body)).flatMap(buffer -> {

                    byte[] bytes = new byte[buffer.readableByteCount()];

                    buffer.read(bytes);
                    DataBufferUtils.release(buffer);

                    // Cache only successful responses
                    // without Set-Cookie headers.
                    if (getStatusCode() != HttpStatus.OK
                            || getHeaders().containsKey(
                            HttpHeaders.SET_COOKIE)) {

                        return super.writeWith(Mono.just(bufferFactory().wrap(bytes)));
                    }

                    Map<String, List<String>> headers = new LinkedHashMap<>();

                    getHeaders().forEach((name, values) -> {

                        if (!name.equalsIgnoreCase(
                                HttpHeaders.CONTENT_LENGTH)
                                && !name.equalsIgnoreCase(
                                HttpHeaders.TRANSFER_ENCODING)) {

                            headers.put(
                                    name,
                                    List.copyOf(values));
                        }
                    });

                    CachedResponse cached = new CachedResponse(HttpStatus.OK.value(), headers, Base64.getEncoder().encodeToString(bytes));
                    // Save the response in Redis.
                    return Mono.fromCallable(() -> objectMapper.writeValueAsString(
                                cached))
                        .flatMap(value -> redis.opsForValue().set(
                            cacheKey,
                            value,
                            Duration.ofSeconds(
                                config.getTtlSeconds())))
                        .onErrorResume(error -> Mono.just(false))
                        .then(Mono.defer(() -> {
                            getHeaders().setContentLength(bytes.length);
                            return super.writeWith(Mono.just(bufferFactory().wrap(bytes)));
                        })
                    );
                });
            }
        };

        return chain.filter(exchange.mutate().response(decorated).build());
    }

    private String sha256(String value) throws Exception {
        byte[] hash = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));

        return java.util.HexFormat.of().formatHex(hash);
    }
}