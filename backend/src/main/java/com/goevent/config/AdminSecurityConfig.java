package com.goevent.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.goevent.repository.AdminAccessRepository;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.NullSecurityContextRepository;
import org.springframework.http.HttpMethod;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;

/** Protect new admin APIs without changing the existing application login contract. */
@Configuration
public class AdminSecurityConfig {
    @Bean
    UserDetailsService disabledDefaultUser() {
        // Prevent Boot from generating an unrelated default user/password.
        return username -> { throw new UsernameNotFoundException("Use the application login"); };
    }
    @Bean
    SecurityFilterChain adminSecurity(HttpSecurity http, AdminAccessRepository access) throws Exception {
        return http.securityMatcher("/api/admin/**", "/api/coordinator-requests/**", "/api/contact/**")
            .cors(org.springframework.security.config.Customizer.withDefaults())
            .securityContext(context -> context.securityContextRepository(new NullSecurityContextRepository()))
            .requestCache(cache -> cache.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/api/admin/auth/csrf").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/admin/auth/login").permitAll()
                .requestMatchers("/api/contact/**").permitAll()
                .requestMatchers("/api/coordinator-requests/**").authenticated()
                .anyRequest().hasRole("ADMIN"))
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, error) -> response.sendError(401))
                .accessDeniedHandler((request, response, error) -> response.sendError(403)))
            .addFilterBefore(new ActiveAdminFilter(access), AnonymousAuthenticationFilter.class)
            .build();
    }

    // Constructed only inside this chain: never registered as a global servlet filter.
    static final class ActiveAdminFilter extends OncePerRequestFilter {
        private final AdminAccessRepository access;
        ActiveAdminFilter(AdminAccessRepository access) { this.access = access; }
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                        FilterChain chain) throws ServletException, IOException {
            var session = request.getSession(false);
            if (session != null && session.getAttribute("adminUserId") instanceof Integer id) {
                if (access.isActiveAdmin(id)) {
                    var context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(new UsernamePasswordAuthenticationToken(id, null,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
                    SecurityContextHolder.setContext(context);
                } else {
                    session.invalidate();
                    SecurityContextHolder.clearContext();
                }
            } else if (session != null && session.getAttribute("userId") instanceof Integer id
                    && request.getRequestURI().contains("/api/coordinator-requests")) {
                if (access.isActiveUser(id)) {
                    var context=SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(new UsernamePasswordAuthenticationToken(id,null,
                        List.of(new SimpleGrantedAuthority("ROLE_MEMBER"))));
                    SecurityContextHolder.setContext(context);
                } else { session.invalidate(); SecurityContextHolder.clearContext(); }
            }
            chain.doFilter(request, response);
        }
    }
}
