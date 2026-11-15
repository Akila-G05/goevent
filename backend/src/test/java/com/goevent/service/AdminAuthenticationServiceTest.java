package com.goevent.service;

import com.goevent.dto.UserDTO;
import com.goevent.repository.AuthenticationRepo;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminAuthenticationServiceTest {
    @Test void sessionReturnsOnlyOwnCurrentDisplayIdentityAndFallsBackToEmail() {
        var account=user(3,1);account.setEmail("admin@example.invalid");account.setFname("Zen");account.setLname("Goku");
        when(users.getUserById(7)).thenReturn(account);
        var request=new MockHttpServletRequest();request.getSession().setAttribute("adminUserId",7);
        var identity=service.session(request);
        assertEquals("Zen Goku",identity.get("name"));assertEquals("admin@example.invalid",identity.get("email"));
        assertFalse(identity.containsKey("password"));
        account.setFname("");account.setLname(null);
        assertEquals("admin@example.invalid",service.session(request).get("name"));
    }
    @Test void sessionIdentityRequiresAnActiveAdminSession() {
        assertThrows(ResponseStatusException.class,()->service.session(new MockHttpServletRequest()));
        var request=new MockHttpServletRequest();request.getSession().setAttribute("adminUserId",7);
        for(var account:new UserDTO[]{user(1,1),user(3,2),null}) {
            when(users.getUserById(7)).thenReturn(account);
            assertThrows(ResponseStatusException.class,()->service.session(request));
        }
    }
    @Test void selfSwitchRotatesBothSessionsWithoutChangingAccountRole() {
        var account=user(3,1);account.setEmail("admin@example.invalid");
        when(users.getUserById(7)).thenReturn(account);
        var request=new MockHttpServletRequest();
        var first=request.getSession();first.setAttribute("adminUserId",7);
        service.switchMode(request,false);
        var ordinary=request.getSession();
        assertNotEquals(first.getId(),ordinary.getId());
        assertNull(ordinary.getAttribute("adminUserId"));
        assertEquals(7,ordinary.getAttribute("userId"));
        assertEquals(7,ordinary.getAttribute("adminUserModeId"));
        service.switchMode(request,true);
        assertNotEquals(ordinary.getId(),request.getSession().getId());
        assertEquals(7,request.getSession().getAttribute("adminUserId"));
        assertNull(request.getSession().getAttribute("userId"));
        assertNull(request.getSession().getAttribute("adminUserModeId"));
        assertEquals(3,account.getRoleId());
    }
    @Test void ordinarySessionCannotElevateWithoutTheServerModeMarker() {
        var request=new MockHttpServletRequest();
        request.getSession().setAttribute("userId",7);
        request.getSession().setAttribute("role","ADMIN");
        assertThrows(ResponseStatusException.class,()->service.switchMode(request,true));
        request.getSession().setAttribute("adminUserModeId",8);
        assertThrows(ResponseStatusException.class,()->service.switchMode(request,true));
        verifyNoInteractions(users);
    }
    @Test void returningToAdminRechecksDemotionDisableAndDeletion() {
        for(var account:new UserDTO[]{user(1,1),user(3,2),null}) {
            when(users.getUserById(7)).thenReturn(account);
            var request=new MockHttpServletRequest();
            request.getSession().setAttribute("userId",7);
            request.getSession().setAttribute("adminUserModeId",7);
            assertThrows(ResponseStatusException.class,()->service.switchMode(request,true));
            assertNull(request.getSession().getAttribute("adminUserId"));
        }
    }
    private final AuthenticationRepo users = mock(AuthenticationRepo.class);
    private final AdminLoginThrottle throttle = mock(AdminLoginThrottle.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final AdminAuthenticationService service = new AdminAuthenticationService(users, encoder, throttle);
    private UserDTO user(int role, int status) {
        var user = new UserDTO(); user.setId(7); user.setRoleId(role); user.setUserStatusId(status);
        user.setPassword(encoder.encode("test-password")); return user;
    }
    @Test void activeAdminReplacesSessionAndNormalizesEmail() {
        when(users.getUserByEmail("admin@example.invalid")).thenReturn(user(3,1));
        var request = new MockHttpServletRequest();
        var old = request.getSession(); var oldId = old.getId(); old.setAttribute("userId", 99);
        assertEquals(7, service.login(" ADMIN@example.invalid ", "test-password", request).get("userId"));
        assertNotEquals(oldId, request.getSession().getId());
        assertNull(request.getSession().getAttribute("userId"));
        assertEquals(7, request.getSession().getAttribute("adminUserId"));
        verify(throttle).check("admin@example.invalid", request.getRemoteAddr());
    }
    @Test void deniesEveryNonAdminOrInactiveStateWithoutCreatingSession() {
        for (int[] state : new int[][]{{1,1},{2,1},{3,2},{3,3},{4,1},{5,1}}) {
            when(users.getUserByEmail("admin@example.invalid")).thenReturn(user(state[0],state[1]));
            var request = new MockHttpServletRequest();
            var error = assertThrows(ResponseStatusException.class,
                () -> service.login("admin@example.invalid", "test-password", request));
            assertEquals(401, error.getStatusCode().value()); assertNull(request.getSession(false));
        }
    }
    @Test void unknownAndWrongPasswordUseSameError() {
        var request = new MockHttpServletRequest();
        var unknown = assertThrows(ResponseStatusException.class,
            () -> service.login("admin@example.invalid", "wrong", request));
        when(users.getUserByEmail("admin@example.invalid")).thenReturn(user(3,1));
        var wrong = assertThrows(ResponseStatusException.class,
            () -> service.login("admin@example.invalid", "wrong", request));
        assertEquals(unknown.getReason(), wrong.getReason()); assertEquals(401, wrong.getStatusCode().value());
    }
    @Test void invalidInputNeverReachesPasswordLookup() {
        assertThrows(ResponseStatusException.class, () -> service.login("", "test", new MockHttpServletRequest()));
        verifyNoInteractions(users, throttle);
    }
}
