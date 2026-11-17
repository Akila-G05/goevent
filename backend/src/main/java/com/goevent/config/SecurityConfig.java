package com.goevent.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.NullSecurityContextRepository;

/**
 * Keeps the application's own login (sessions in Redis) as the only authentication.
 * The contact form keeps CSRF protection; every other endpoint is open to its controller.
 */
@Configuration
public class SecurityConfig {

    @Bean
    UserDetailsService disabledDefaultUser() {
        // Prevent Boot from generating an unrelated default user/password.
        return username -> { throw new UsernameNotFoundException("Use the application login"); };
    }

    @Bean
    @Order(1)
    SecurityFilterChain contactSecurity(HttpSecurity http) throws Exception {
        return http.securityMatcher("/api/contact/**")
            .cors(Customizer.withDefaults())
            .securityContext(context -> context.securityContextRepository(new NullSecurityContextRepository()))
            .requestCache(cache -> cache.disable())
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, error) -> response.sendError(401))
                .accessDeniedHandler((request, response, error) -> response.sendError(403)))
            .build();
    }

    @Bean
    @Order(2)
    SecurityFilterChain applicationSecurity(HttpSecurity http) throws Exception {
        return http.csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .securityContext(context -> context.securityContextRepository(new NullSecurityContextRepository()))
            .requestCache(cache -> cache.disable())
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .build();
    }
}
