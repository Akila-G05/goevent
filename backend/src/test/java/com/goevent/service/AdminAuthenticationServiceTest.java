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
