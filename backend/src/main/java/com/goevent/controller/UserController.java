package com.goevent.controller;

import com.goevent.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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

    // Profile data for the signed-in user (one request: profile + options)
    @GetMapping("/data")
    public ResponseEntity<String> userData(HttpServletRequest httpRequest) {
        return userService.getCurrentUserData(httpRequest);
    }

    // Update the editable profile fields of the signed-in user
    @PutMapping("/data")
    public ResponseEntity<String> updateUserData(
            @RequestBody String body,
            HttpServletRequest httpRequest
    ) {
        return userService.updateCurrentUserData(body, httpRequest);
    }

    // Upload a profile image (multipart form field: "file")
    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> uploadProfileImage(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest httpRequest
    ) {
        return userService.uploadProfileImage(file, httpRequest);
    }

    // Serve an uploaded profile image
    @GetMapping("/image/{filename}")
    public ResponseEntity<?> profileImage(@PathVariable String filename) {
        return userService.getProfileImage(filename);
    }
}
