package com.goevent;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class GoeventApplication {
    public static void main(String[] args) {
        System.out.println("Site Url is http://localhost:8081/goevent/api/");
        SpringApplication.run(GoeventApplication.class);
    }
}