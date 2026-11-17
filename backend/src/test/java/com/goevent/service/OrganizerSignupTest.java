package com.goevent.service;

import com.goevent.dto.UserDTO;
import com.goevent.enums.Role;
import com.goevent.enums.UserStatus;
import com.goevent.repository.AuthenticationRepo;
import com.google.gson.JsonParser;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class OrganizerSignupTest {
    @Test void organizerSignupIsActiveAndSignedInWithItsOrganization() {
        var users = mock(AuthenticationRepo.class);
        var registered = new UserDTO();
        registered.setId(9);
        registered.setRoleId(Role.ORGANIZER.getId());
        registered.setUserStatusId(UserStatus.ACTIVE.getId());
        registered.setFname("Olivia");
        registered.setLname("Perera");
        when(users.getUserByEmail("olivia@example.invalid")).thenReturn(null, registered);
        when(users.registerManualUser(anyString(), anyString(), anyString(), anyString(), anyInt(), anyInt())).thenReturn(1);
        var service = new AuthenticationService(users, new BCryptPasswordEncoder(4));

        String json = service.handleManualRegistration(Map.of(
            "fname", "Olivia", "lname", "Perera", "email", "olivia@example.invalid",
            "password", "testpass1234", "confirmPassword", "testpass1234",
            "roleId", "2", "orgId", "1", "position", "Event coordinator"), new MockHttpServletRequest());

        var body = JsonParser.parseString(json).getAsJsonObject();
        assertTrue(body.get("status").getAsBoolean());
        assertEquals("REGISTERED", body.get("action").getAsString());
        verify(users).registerManualUser(eq("Olivia"), eq("Perera"), eq("olivia@example.invalid"),
            anyString(), eq(UserStatus.ACTIVE.getId()), eq(Role.ORGANIZER.getId()));
        verify(users).registerOrganizerData(9, 1, "Event coordinator");
    }
}
