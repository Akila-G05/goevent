package com.goevent.controller;

import com.goevent.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // Profile data for the signed-in user
    @GetMapping("/data")
    public ResponseEntity<String> userData(HttpServletRequest httpRequest) {
        return userService.getCurrentUserData(httpRequest);
    }
}
