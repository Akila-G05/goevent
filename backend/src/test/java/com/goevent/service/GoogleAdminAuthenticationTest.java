package com.goevent.service;

import com.goevent.dto.UserDTO;
import com.goevent.repository.AuthenticationRepo;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.gson.JsonParser;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GoogleAdminAuthenticationTest {
    @Test void verifiedSubjectAndActiveDatabaseAdminEstablishDedicatedAccess() throws Exception {
        var repository=mock(AuthenticationRepo.class);
        var service=new AuthenticationService(repository,new BCryptPasswordEncoder(4),mock(RegistrationService.class));
        ReflectionTestUtils.setField(service,"googleClientId","fixture.apps.googleusercontent.com");
        var verifier=mock(GoogleIdTokenVerifier.class);
        var token=mock(GoogleIdToken.class);
        var payload=new GoogleIdToken.Payload();
        payload.setSubject("verified-subject");payload.setEmail("admin@example.invalid");payload.setEmailVerified(true);
        when(token.getPayload()).thenReturn(payload);
        when(verifier.verify("signed-fixture")).thenReturn(token);
        var admin=new UserDTO();admin.setId(7);admin.setRoleId(3);admin.setUserStatusId(1);admin.setEmail("admin@example.invalid");
        when(repository.getUserByGoogleSub("verified-subject")).thenReturn(admin);
        try(var builders=mockConstruction(GoogleIdTokenVerifier.Builder.class,(builder,context)->{
            when(builder.setAudience(anyCollection())).thenReturn(builder);when(builder.build()).thenReturn(verifier);
        })) {
            var request=new MockHttpServletRequest();
            var response=JsonParser.parseString(service.handleGoogleAuthentication(Map.of("idToken","signed-fixture"),request)).getAsJsonObject();
            assertTrue(response.get("status").getAsBoolean());
            assertEquals("ADMIN",response.get("roleId").getAsString());
            assertEquals(7,request.getSession().getAttribute("adminUserId"));
            assertNull(request.getSession().getAttribute("userId"));
            verify(verifier).verify("signed-fixture");
            verify(builders.constructed().getFirst()).setAudience(java.util.List.of("fixture.apps.googleusercontent.com"));
        }
    }
    @Test void invalidTokenCannotReachDatabaseOrCreateAnAdminSession() throws Exception {
        var repository=mock(AuthenticationRepo.class);
        var service=new AuthenticationService(repository,new BCryptPasswordEncoder(4),mock(RegistrationService.class));
        ReflectionTestUtils.setField(service,"googleClientId","fixture.apps.googleusercontent.com");
        var verifier=mock(GoogleIdTokenVerifier.class);
        try(var builders=mockConstruction(GoogleIdTokenVerifier.Builder.class,(builder,context)->{
            when(builder.setAudience(anyCollection())).thenReturn(builder);when(builder.build()).thenReturn(verifier);
        })) {
            var request=new MockHttpServletRequest();
            var result=JsonParser.parseString(service.handleGoogleAuthentication(Map.of("idToken","invalid-fixture"),request)).getAsJsonObject();
            assertFalse(result.get("status").getAsBoolean());assertNull(request.getSession(false));verifyNoInteractions(repository);
        }
    }
    @Test void verifiedGoogleOrganizerRegistrationIsActiveWithoutAdminReview() throws Exception {
        var users=mock(AuthenticationRepo.class);var registrations=mock(RegistrationService.class);
        var service=new AuthenticationService(users,new BCryptPasswordEncoder(4),registrations);
        ReflectionTestUtils.setField(service,"googleClientId","fixture.apps.googleusercontent.com");
        var verifier=mock(GoogleIdTokenVerifier.class);var token=mock(GoogleIdToken.class);
        var payload=new GoogleIdToken.Payload();payload.setSubject("organizer-subject");
        payload.setEmail("organizer@example.invalid");payload.setEmailVerified(true);
        when(token.getPayload()).thenReturn(payload);when(verifier.verify("signed-fixture")).thenReturn(token);
        var user=new UserDTO();user.setId(7);user.setRoleId(2);user.setUserStatusId(1);user.setEmail("organizer@example.invalid");
        when(registrations.register(any())).thenReturn(user);
        try(var builders=mockConstruction(GoogleIdTokenVerifier.Builder.class,(builder,context)->{
            when(builder.setAudience(anyCollection())).thenReturn(builder);when(builder.build()).thenReturn(verifier);
        })) {
            var request=new MockHttpServletRequest();
            var result=JsonParser.parseString(service.handleGoogleAuthentication(Map.of("idToken","signed-fixture","roleId",2,"orgId",1,"position","Chair"),request)).getAsJsonObject();
            assertTrue(result.get("status").getAsBoolean());assertEquals("REGISTERED",result.get("action").getAsString());
            assertEquals(7,request.getSession().getAttribute("userId"));
            var input=org.mockito.ArgumentCaptor.forClass(RegistrationService.Input.class);
            verify(registrations).register(input.capture());assertEquals(com.goevent.enums.Role.ORGANIZER,input.getValue().role());
            assertEquals("organizer-subject",input.getValue().googleSubject());
        }
    }

}
