package com.goevent.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.NullSecurityContextRepository;

/**
 * Keeps the application's own login (sessions in Redis) as the only authentication.
 * Controllers perform their own authorisation, so no request is rejected here.
 */
@Configuration
public class SecurityConfig {

    @Bean
    UserDetailsService disabledDefaultUser() {
        // Prevent Boot from generating an unrelated default user/password.
        return username -> { throw new UsernameNotFoundException("Use the application login"); };
    }

    @Bean
    SecurityFilterChain applicationSecurity(HttpSecurity http) throws Exception {
        return http.csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .securityContext(context -> context.securityContextRepository(new NullSecurityContextRepository()))
            .requestCache(cache -> cache.disable())
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .build();
    }
}
