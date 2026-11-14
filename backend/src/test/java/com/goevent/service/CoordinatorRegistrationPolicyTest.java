package com.goevent.service;

import com.goevent.repository.AuthenticationRepo;
import com.google.gson.JsonParser;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CoordinatorRegistrationPolicyTest {
    @Test void privilegedRolesCannotBeSelfRegisteredByEitherLoginMethod() {
        var users=mock(AuthenticationRepo.class);
        var service=new AuthenticationService(users,new BCryptPasswordEncoder(4));
        for(int role:new int[]{2,3,5}) {
            String google=service.handleGoogleAuthentication(Map.of("idToken","test-token","roleId",role),new MockHttpServletRequest());
            assertFalse(JsonParser.parseString(google).getAsJsonObject().get("status").getAsBoolean());
            String manual=service.handleManualRegistration(Map.of("fname","Test","lname","Fixture","email","test@example.invalid","password","testpass1234","confirmPassword","testpass1234","roleId",Integer.toString(role)),new MockHttpServletRequest());
            assertFalse(JsonParser.parseString(manual).getAsJsonObject().get("status").getAsBoolean());
        }
        verifyNoInteractions(users);
    }
}
