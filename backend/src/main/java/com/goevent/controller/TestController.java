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

}
