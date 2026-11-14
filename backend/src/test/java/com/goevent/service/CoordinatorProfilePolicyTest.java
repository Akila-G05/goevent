package com.goevent.service;

import com.goevent.dto.UserDTO;
import com.goevent.repository.UserRepo;
import com.goevent.repository.ContentRepo;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CoordinatorProfilePolicyTest {
    @Test void coordinatorCannotBypassReviewByChangingOrganizationInProfile() {
        var users=mock(UserRepo.class);
        var user=new UserDTO(); user.setId(7); user.setRoleId(2); user.setUserStatusId(1);
        user.setFname("Test"); user.setLname("Fixture");
        when(users.getUserById(7)).thenReturn(user);
        when(users.organizationExists(2)).thenReturn(true);
        when(users.getOrganizerDetail(7)).thenReturn(Map.of("organization_id",1));
        var service=new UserService(users,mock(ContentRepo.class),mock(ImageUploadService.class));
        var request=new MockHttpServletRequest(); request.getSession().setAttribute("userId",7);
        var result=service.updateCurrentUserData("{\"organization\":{\"organizationId\":2,\"position\":\"Coordinator\"}}",request);
        assertEquals(400,result.getStatusCode().value());
        verify(users,never()).upsertOrganizerDetail(anyInt(),anyInt(),anyString());
        verify(users,never()).updateProfile(anyInt(),anyString(),anyString(),any(),any());
    }
}
