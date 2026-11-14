package com.goevent.controller;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.util.Map;
import com.goevent.service.AuthenticationService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthenticationControllerTest {
    @Test void neverPrintsTheGoogleCredential() {
        var service = mock(AuthenticationService.class);
        var request = new MockHttpServletRequest();
        when(service.handleGoogleAuthentication(Map.of("idToken", "sensitive-test-token"), request)).thenReturn("{}");
        var original = System.out;
        var captured = new ByteArrayOutputStream();
        try {
            System.setOut(new PrintStream(captured));
            assertEquals("{}", new AuthenticationController(service).googleAuthentication(
                    Map.of("idToken", "sensitive-test-token"), request));
        } finally {
            System.setOut(original);
        }
        assertFalse(captured.toString().contains("sensitive-test-token"));
    }
}
