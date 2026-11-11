package com.goevent.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

import com.goevent.gateway.config.CacheProperties;

@SpringBootApplication
@EnableConfigurationProperties(CacheProperties.class)
public class GatewayApplication {
    public static void main(String[] args) {
        System.out.println("Site Url is http://localhost:8080/goevent/api/");
        SpringApplication.run(GatewayApplication.class);
    }
}
