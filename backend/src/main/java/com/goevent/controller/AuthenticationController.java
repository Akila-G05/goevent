package com.goevent.controller;

import com.goevent.service.AuthenticationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthenticationController {
    private AuthenticationService authenticationService;

    public AuthenticationController(AuthenticationService authenticationService) {
        this.authenticationService = authenticationService;
    }

    @PostMapping("/google")
    public String googleAuthentication(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String idToken = request.get("idToken");
//        int roleid = Integer.valueOf(request.get("roldeId"));
//
//        if(roleid == 1) { //USER
//            //no parameters
//        }else if(roleid == 4){
//            String index = request.get("index");
//            String uniEmail = request.get("unimail");
//        }else if (roleid == 2){
//            int orgId = Integer.valueOf(request.get("orgId"));
//            String position = request.get("position");
//        }

        System.out.println("Token received: " + idToken);

//        HttpSession session = httpRequest.getSession(false);
//
//        System.out.println("Session data: " + session.getAttribute("email"));

        return authenticationService.handleGoogleAuthentication(idToken, httpRequest);
    }
}
