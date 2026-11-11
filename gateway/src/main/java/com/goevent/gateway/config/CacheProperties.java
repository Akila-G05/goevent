package com.goevent.gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Set;

/**
 * Shared response-cache policy.
 *
 * <p>Paths listed here must return identical public data for every caller;
 * never add user-specific or personalised endpoints. An empty list disables
 * the shared response cache entirely (fail closed).</p>
 */
@ConfigurationProperties(prefix = "goevent.cache")
public class CacheProperties {

    private Set<String> publicPaths = Set.of();

    public Set<String> getPublicPaths() {
        return publicPaths;
    }

    public void setPublicPaths(Set<String> publicPaths) {
        this.publicPaths = publicPaths;
    }
}
