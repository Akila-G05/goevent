package com.goevent.service;

import com.goevent.repository.AuthenticationRepo;
import org.springframework.stereotype.Service;

@Service
public class AuthenticationService {

    private final AuthenticationRepo authenticationRepo;

    public AuthenticationService(AuthenticationRepo authenticationRepo) {
        this.authenticationRepo = authenticationRepo;
    }
}
