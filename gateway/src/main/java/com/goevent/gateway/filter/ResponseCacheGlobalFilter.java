
package com.goevent.gateway.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpResponseDecorator;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.reactivestreams.Publisher;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class ResponseCacheGlobalFilter
        implements GlobalFilter, Ordered {

    private static final Logger log =
            LoggerFactory.getLogger(
                    ResponseCacheGlobalFilter.class
            );

    private final ReactiveStringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public ResponseCacheGlobalFilter(
            ReactiveStringRedisTemplate redis,
            ObjectMapper objectMapper) {

        this.redis = redis;
        this.objectMapper = objectMapper;
    }

    // Run before Gateway's NettyWriteResponseFilter (-1).
    @Override
    public int getOrder() {
        return -2;
    }

    @Override
    public Mono<Void> filter(
            ServerWebExchange exchange,
            GatewayFilterChain chain) {

        ServerHttpResponseDecorator decorated =
                new ServerHttpResponseDecorator(
                        exchange.getResponse()) {

                    @Override
                    public Mono<Void> writeWith(
                            Publisher<? extends DataBuffer> body) {

                        return cacheAndWrite(body);
                    }

                    @Override
                    public Mono<Void> writeAndFlushWith(
                            Publisher<? extends Publisher<
                                    ? extends DataBuffer>> body) {

                        // Preserve normal streaming when caching
                        // does not apply.
                        String key = exchange.getAttribute(
                                ResponseCacheGatewayFilterFactory
                                        .CACHE_KEY_ATTRIBUTE
                        );

                        Boolean bypass = exchange.getAttribute(
                                ResponseCacheGatewayFilterFactory
                                        .CACHE_BYPASS_ATTRIBUTE
                        );

                        if (key == null
                                || Boolean.TRUE.equals(bypass)) {

                            return super.writeAndFlushWith(body);
                        }

                        // A cacheable response needs to be collected
                        // so its complete body can be stored.
                        Flux<DataBuffer> combined =
                                Flux.from(body)
                                        .concatMap(part -> Flux.from(part));

                        return cacheAndWrite(combined);
                    }

                    private Mono<Void> cacheAndWrite(
                            Publisher<? extends DataBuffer> body) {

                        String cacheKey = exchange.getAttribute(
                                ResponseCacheGatewayFilterFactory
                                        .CACHE_KEY_ATTRIBUTE
                        );

                        Long ttlSeconds = exchange.getAttribute(
                                ResponseCacheGatewayFilterFactory
                                        .CACHE_TTL_ATTRIBUTE
                        );

                        Boolean bypass = exchange.getAttribute(
                                ResponseCacheGatewayFilterFactory
                                        .CACHE_BYPASS_ATTRIBUTE
                        );

                        // No cache configured for this route,
                        // or the response is already a cache hit.
                        if (cacheKey == null
                                || ttlSeconds == null
                                || Boolean.TRUE.equals(bypass)) {

                            return super.writeWith(body);
                        }

                        log.info(
                                "ResponseCache writeWith() intercepted"
                        );

                        return DataBufferUtils.join(
                                        Flux.from(body)
                                )

                                .map(buffer -> {

                                    byte[] bytes = new byte[
                                            buffer.readableByteCount()
                                            ];

                                    buffer.read(bytes);
                                    DataBufferUtils.release(buffer);

                                    return bytes;
                                })

                                .defaultIfEmpty(new byte[0])

                                .flatMap(bytes -> {

                                    var status = getStatusCode();

                                    // Cache only HTTP 200 responses
                                    // that do not set cookies.
                                    if (status == null
                                            || status.value()
                                            != HttpStatus.OK.value()
                                            || getHeaders().containsKey(
                                            HttpHeaders.SET_COOKIE)) {

                                        log.info(
                                                "Response not cacheable; status={}",
                                                status
                                        );

                                        return super.writeWith(
                                                Mono.just(
                                                        bufferFactory()
                                                                .wrap(bytes)
                                                )
                                        );
                                    }

                                    Map<String, List<String>> headers =
                                            new LinkedHashMap<>();

                                    getHeaders().forEach(
                                            (name, values) -> {

                                                if (!name.equalsIgnoreCase(
                                                        HttpHeaders.CONTENT_LENGTH)
                                                        && !name.equalsIgnoreCase(
                                                        HttpHeaders.TRANSFER_ENCODING)
                                                        && !name.toLowerCase()
                                                        .startsWith("x-ratelimit-")) {

                                                    headers.put(
                                                            name,
                                                            List.copyOf(values)
                                                    );
                                                }
                                            }
                                    );

                                    ResponseCacheGatewayFilterFactory
                                            .CachedResponse cached =
                                            new ResponseCacheGatewayFilterFactory
                                                    .CachedResponse(
                                                    HttpStatus.OK.value(),
                                                    headers,
                                                    Base64.getEncoder()
                                                            .encodeToString(bytes)
                                            );

                                    // Store the response, but never let
                                    // a Redis failure break the request.
                                    return Mono.fromCallable(() ->
                                                    objectMapper.writeValueAsString(
                                                            cached
                                                    )
                                            )

                                            .flatMap(json ->
                                                    redis.opsForValue()
                                                            .set(
                                                                    cacheKey,
                                                                    json,
                                                                    Duration.ofSeconds(
                                                                            ttlSeconds
                                                                    )
                                                            )
                                            )

                                            .doOnNext(saved -> {

                                                if (saved) {

                                                    log.info(
                                                            "RESPONSE CACHED successfully: {}",
                                                            cacheKey
                                                    );

                                                } else {

                                                    log.warn(
                                                            "Redis did not confirm cache save: {}",
                                                            cacheKey
                                                    );
                                                }
                                            })

                                            .onErrorResume(error -> {

                                                log.error(
                                                        "Failed to cache response: {}",
                                                        cacheKey,
                                                        error
                                                );

                                                return Mono.just(false);
                                            })

                                            // Return the original response
                                            // whether the cache write worked
                                            // or failed.
                                            .then(Mono.defer(() -> {

                                                getHeaders().setContentLength(
                                                        bytes.length
                                                );

                                                return super.writeWith(
                                                        Mono.just(
                                                                bufferFactory()
                                                                        .wrap(bytes)
                                                        )
                                                );
                                            }));
                                });
                    }
                };

        return chain.filter(
                exchange.mutate()
                        .response(decorated)
                        .build()
        );
    }
}
