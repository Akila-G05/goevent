package com.goevent.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.List;
import java.net.URI;
import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class CorsConfig {

    private final List<String> origins;

    public CorsConfig(@Value("${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}") String configured,
                      @Value("${app.cors.require-https:false}") boolean requireHttps) {
        origins = Arrays.stream(configured.split(",", -1)).map(String::trim).toList();
        for (String origin : origins) {
            URI uri = URI.create(origin);
            if (uri.getHost() == null || uri.getUserInfo() != null || uri.getQuery() != null
                    || uri.getFragment() != null || (uri.getPath() != null && !uri.getPath().isEmpty())
                    || !("https".equals(uri.getScheme()) || (!requireHttps && "http".equals(uri.getScheme())))) {
                throw new IllegalArgumentException("CORS requires explicit allowed origins");
            }
        }
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration = new CorsConfiguration();

        // Allowed frontend origins
        configuration.setAllowedOrigins(origins);

        // Allowed HTTP methods
        configuration.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "PATCH",
                "DELETE", "OPTIONS"
        ));

        // Allowed headers
        configuration.setAllowedHeaders(List.of("*"));

        // Allow credentials
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    @Bean
    public CorsWebFilter corsWebFilter() {
        return new CorsWebFilter(corsConfigurationSource());
    }
}