package com.goevent.service;

import com.goevent.dto.UserDTO;
import com.goevent.repository.AuthenticationRepo;
import com.google.gson.JsonParser;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SessionSwitchTest {
    @Test void verifiedGoogleAdminGetsDedicatedSessionAndOrdinaryUsersDoNot() {
        var service=new AuthenticationService(mock(AuthenticationRepo.class),new BCryptPasswordEncoder(4),mock(RegistrationService.class));
        var request=new MockHttpServletRequest();
        var previous=(MockHttpSession)request.getSession(true);
        previous.setAttribute("userId",99);
        var admin=new UserDTO(); admin.setId(7); admin.setRoleId(3); admin.setUserStatusId(1);
        service.createVerifiedGoogleSession(request,admin);
        assertTrue(previous.isInvalid());
        assertEquals(7,request.getSession().getAttribute("adminUserId"));
        assertNull(request.getSession().getAttribute("userId"));
        var member=new UserDTO(); member.setId(8); member.setRoleId(1); member.setUserStatusId(1);
        service.createVerifiedGoogleSession(request,member);
        assertNull(request.getSession().getAttribute("adminUserId"));
        assertEquals(8,request.getSession().getAttribute("userId"));
    }
    @Test void inactiveGoogleAdminsCannotEstablishDedicatedAccess() {
        var service=new AuthenticationService(mock(AuthenticationRepo.class),new BCryptPasswordEncoder(4),mock(RegistrationService.class));
        for(int status:new int[]{2,3}) {
            var admin=new UserDTO();admin.setId(7);admin.setRoleId(3);admin.setUserStatusId(status);
            var request=new MockHttpServletRequest();
            assertThrows(IllegalStateException.class,()->service.createVerifiedGoogleSession(request,admin));
            assertNull(request.getSession(false));
        }
    }
    @Test void ordinaryLoginReplacesAdminSessionAndRemovesElevatedIdentity() {
        var repository=mock(AuthenticationRepo.class);
        var encoder=new BCryptPasswordEncoder(4);
        var service=new AuthenticationService(repository,encoder,mock(RegistrationService.class));
        var user=new UserDTO();
        user.setId(12); user.setEmail("member@example.invalid"); user.setRoleId(1);
        user.setUserStatusId(1); user.setAuthTypeId(2); user.setPassword(encoder.encode("test-password"));
        when(repository.getUserByEmail("member@example.invalid")).thenReturn(user);
        var request=new MockHttpServletRequest();
        var previous=(MockHttpSession)request.getSession(true);
        previous.setAttribute("adminUserId",1);
        var result=JsonParser.parseString(service.handleManualAuthentication(
            Map.of("email","member@example.invalid","password","test-password"),request)).getAsJsonObject();
        assertTrue(result.get("status").getAsBoolean());
        assertTrue(previous.isInvalid());
        assertNotEquals(previous.getId(),request.getSession().getId());
        assertNull(request.getSession().getAttribute("adminUserId"));
        assertEquals(12,request.getSession().getAttribute("userId"));
    }
}
