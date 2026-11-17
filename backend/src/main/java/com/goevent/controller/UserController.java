package com.goevent.controller;

import com.goevent.dto.UserProfileDTO;
import com.goevent.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    //get profile data
    @GetMapping("/data")
    public ResponseEntity<String> userData(HttpServletRequest httpRequest) {
        return userService.getCurentUserData(httpRequest);
    }

    //update user data
    @PutMapping("/data")
    public ResponseEntity<String> updateUserData(@RequestBody UserProfileDTO body, HttpServletRequest httpRequest) {
        return userService.updateCurentUserData(body, httpRequest);
    }

    //upload profil image
    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> uploadProfileImage(@RequestParam("file") MultipartFile file, HttpServletRequest httpRequest) {
        return userService.uploadProfileImage(file, httpRequest);
    }
}