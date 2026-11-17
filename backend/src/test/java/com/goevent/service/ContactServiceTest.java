package com.goevent.service;

import com.goevent.dto.ContactRequest;
import com.goevent.repository.ContactRepo;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class ContactServiceTest {
    @Test void storesTrimmedMessageWithLowerCaseEmail() {
        var repo = mock(ContactRepo.class);
        when(repo.create(anyString(), anyString(), anyString())).thenReturn(42L);
        var service = new ContactService(repo);

        long id = service.submit(new ContactRequest("Visitor@Example.com", " Question ", " Is there parking? "));

        assertEquals(42L, id);
        verify(repo).create("visitor@example.com", "Question", "Is there parking?");
    }

    @Test void rejectsInvalidEmailWithoutStoringAnything() {
        var repo = mock(ContactRepo.class);
        var service = new ContactService(repo);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> service.submit(new ContactRequest("not-an-email", "Subject", "Body")));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(repo, never()).create(anyString(), anyString(), anyString());
    }
}
