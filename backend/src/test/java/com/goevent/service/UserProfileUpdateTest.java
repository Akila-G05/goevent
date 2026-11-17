package com.goevent.service;

import com.goevent.dto.UserDTO;
import com.goevent.dto.UserProfileDTO;
import com.goevent.repository.ContentRepo;
import com.goevent.repository.UserRepo;
import com.google.gson.JsonParser;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class UserProfileUpdateTest {

    private static UserDTO user() {
        var user = new UserDTO();
        user.setId(7);
        user.setRoleId(1);
        user.setUserStatusId(1);
        user.setFname("Kavishka");
        user.setLname("Devinda");
        user.setEmail("kavishka@gmail.com");
        user.setMobile("0771234567");
        user.setProfileImgUrl("/goevent/api/images/profile/7/old.png");
        return user;
    }

    private static MockHttpServletRequest signedIn() {
        var request = new MockHttpServletRequest();
        request.getSession().setAttribute("userId", 7);
        return request;
    }

    private static UserProfileDTO only(String mobile, String profileImgUrl) {
        return new UserProfileDTO(null, null, null, null, null, mobile, null, null, profileImgUrl, null, null, null, null);
    }

    @Test void missingFieldsKeepTheCurrentValues() {
        var users = mock(UserRepo.class);
        when(users.getUserById(7)).thenReturn(user());
        var files = mock(FileUploadService.class);
        when(files.isOwnUrl(FileUploadService.SCOPE_PROFILE, "/goevent/api/images/profile/7/old.png")).thenReturn(true);
        var service = new UserService(users, mock(ContentRepo.class), files);

        var result = service.updateCurentUserData(only("0779999999", null), signedIn());

        assertEquals(200, result.getStatusCode().value());
        verify(users).updateProfile(7, "Kavishka", "Devinda", "0779999999", "/goevent/api/images/profile/7/old.png");
        verify(files, never()).deleteFile(anyString(), anyString());
    }

    @Test void anEmptyPictureUrlRemovesThePictureAndDeletesTheFile() {
        var users = mock(UserRepo.class);
        when(users.getUserById(7)).thenReturn(user());
        var files = mock(FileUploadService.class);
        var service = new UserService(users, mock(ContentRepo.class), files);

        service.updateCurentUserData(only("0771234567", ""), signedIn());

        verify(users).updateProfile(7, "Kavishka", "Devinda", "0771234567", null);
        verify(files).deleteFile(FileUploadService.SCOPE_PROFILE, "/goevent/api/images/profile/7/old.png");
    }

    @Test void theResponseUsesTheSameNestedShapeAsTheRequest() {
        var users = mock(UserRepo.class);
        var student = user();
        student.setRoleId(4);
        when(users.getUserById(7)).thenReturn(student);
        when(users.getStudentDetail(7)).thenReturn(java.util.Map.of(
                "index_no", "ICT001", "uni_email", "kavishka@university.lk",
                "university_id", 1, "university_name", "University of Sri Jayewardenepura"));
        var content = mock(ContentRepo.class);
        when(content.getUniversities()).thenReturn(List.of(java.util.Map.of("id", 1, "name", "University of Sri Jayewardenepura")));
        when(content.getOrganizations()).thenReturn(List.of());
        when(users.getOrganizerDetail(7)).thenReturn(null);
        var service = new UserService(users, content, mock(FileUploadService.class));

        var result = service.getCurentUserData(signedIn());
        var body = JsonParser.parseString(result.getBody()).getAsJsonObject();

        assertTrue(body.get("status").getAsBoolean());
        assertEquals("STUDENT", body.get("role").getAsString());
        assertEquals("Kavishka Devinda", body.get("name").getAsString());
        assertEquals("ICT001", body.getAsJsonObject("student").get("indexNo").getAsString());
        assertEquals(1, body.getAsJsonObject("options").getAsJsonArray("universities").size());
        assertFalse(body.has("organization"));
    }
}
