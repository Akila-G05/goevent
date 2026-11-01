package com.goevent.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class GatewayApplication {
    public static void main(String[] args) {
        System.out.println("Site Url is http://localhost:8080/goevent/api/");
        SpringApplication.run(GatewayApplication.class);
    }
}
