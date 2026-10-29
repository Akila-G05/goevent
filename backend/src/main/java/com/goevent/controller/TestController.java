package com.goevent.controller;

import com.goevent.dto.TestDTO;
import com.goevent.service.TestService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class TestController {

    private final TestService testService;

    public TestController(TestService testService) {
        this.testService = testService;
    }

    @GetMapping("/test")
    public List<TestDTO> getAllUsers() {
        return testService.getData();
    }

    @GetMapping("/test/strict")
    public String strictRateLimitTest() {
        return "Strict rate limit endpoint";
    }

    @GetMapping("/test/normal")
    public String normalRateLimitTest() {
        return "Normal rate limit endpoint";
    }

    @GetMapping("/test/relaxed")
    public String relaxedRateLimitTest() {
        return "Relaxed rate limit endpoint";
    }

}
