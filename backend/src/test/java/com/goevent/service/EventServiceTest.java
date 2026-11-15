package com.goevent.service;

import com.goevent.dto.EventDTO;
import com.goevent.exception.EventException;
import com.goevent.repository.EventRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EventServiceTest {

    private static final ZoneId UTC = ZoneId.of("UTC");

    private EventRepo repo;
    private EventService service;
    private MockHttpServletRequest request;
    private LocalDate eventDate;

    @BeforeEach
    void setUp() {
        repo = mock(EventRepo.class);
        service = new EventService(repo);
        request = new MockHttpServletRequest();
        eventDate = LocalDate.now(UTC).plusDays(30);

        when(repo.account(7)).thenReturn(Map.of("role_id", 2, "user_status_id", 1));
        when(repo.categoryId("Technology")).thenReturn(Optional.of(2));
        when(repo.audienceId("University")).thenReturn(Optional.of(1));
        when(repo.tagId("Technology")).thenReturn(Optional.of(7));
        when(repo.insertVenue(anyString(), any(), anyString(), any())).thenReturn(41L);
        when(repo.insertLink(anyString(), anyString())).thenReturn(51L, 52L);
        when(repo.insertEvent(anyString(), any(), anyInt(), anyLong(), anyInt(), anyInt(), anyInt(),
                anyInt(), any(), any())).thenReturn(99L);
    }

    @Test
    void rejectsAnAnonymousRequest() {
        EventException error = assertThrows(EventException.class,
                () -> service.create(validPayload(), request));

        assertEquals(HttpStatus.UNAUTHORIZED, error.status());
        verify(repo, never()).insertEvent(anyString(), any(), anyInt(), anyLong(), anyInt(),
                anyInt(), anyInt(), anyInt(), any(), any());
    }

    @Test
    void rejectsAnAccountThatIsNotActive() {
        signedIn(7);
        when(repo.account(7)).thenReturn(Map.of("role_id", 2, "user_status_id", 2));

        EventException error = assertThrows(EventException.class,
                () -> service.create(validPayload(), request));

        assertEquals(HttpStatus.FORBIDDEN, error.status());
    }

    @Test
    void rejectsAnOrdinaryUser() {
        signedIn(7);
        when(repo.account(7)).thenReturn(Map.of("role_id", 1, "user_status_id", 1));

        EventException error = assertThrows(EventException.class,
                () -> service.create(validPayload(), request));

        assertEquals(HttpStatus.FORBIDDEN, error.status());
    }

    @Test
    void rejectsFreeAndPaidEventsUntilThoseFlowsExist() {
        signedIn(7);
        EventDTO payload = validPayload();
        payload.setEventLevelId(3);

        EventException error = assertThrows(EventException.class,
                () -> service.create(payload, request));

        assertEquals(HttpStatus.BAD_REQUEST, error.status());
        assertEquals("Free and paid ticketing are coming soon. Create a listing-only event for now.",
                error.getMessage());
    }

    @Test
    void rejectsAnOccurrenceWhoseEndTimeIsBeforeItsStart() {
        signedIn(7);
        EventDTO payload = validPayload();
        payload.getDates().get(0).setEndTime("17:00");

        EventException error = assertThrows(EventException.class,
                () -> service.create(payload, request));

        assertEquals(HttpStatus.BAD_REQUEST, error.status());
        verify(repo, never()).insertVenue(anyString(), any(), anyString(), any());
    }

    @Test
    void storesEveryLinkAndTheJoinedTimeRange() {
        signedIn(7);

        EventDTO payload = validPayload();
        payload.getLinks().add(link("Instagram", "https://instagram.com/goevent"));

        long id = service.create(payload, request);

        assertEquals(99L, id);
        verify(repo, org.mockito.Mockito.times(2)).insertLink(anyString(), anyString());
        verify(repo).linkEvent(99L, 51L);
        verify(repo).linkEvent(99L, 52L);

        ArgumentCaptor<String> range = ArgumentCaptor.forClass(String.class);
        verify(repo).insertEventDate(eq(99L), eq(eventDate), range.capture());
        assertEquals("18:00 - 22:00", range.getValue());

        verify(repo).insertEvent(
                eq("Tech Fest 2026"), eq("Design preview"), eq(2), eq(41L), eq(1), eq(1), eq(1),
                eq(7), any(), any());

        verify(repo).attachTag(99L, 7);
    }

    // --- fixtures --------------------------------------------------------

    private void signedIn(int userId) {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("userId", userId);
        request.setSession(session);
    }

    private EventDTO validPayload() {
        EventDTO payload = new EventDTO();
        payload.setName("Tech Fest 2026");
        payload.setDescription("Design preview");
        payload.setCategoryName("Technology");
        payload.setAudienceName("University");
        payload.setEventLevelId(1);
        payload.setVenue(venue());
        payload.setLinks(new java.util.ArrayList<>(List.of(link("Website", "https://goevent.lk"))));
        payload.setDates(new java.util.ArrayList<>(List.of(date("18:00", "22:00"))));
        payload.setTags(List.of("Technology"));
        return payload;
    }

    private EventDTO.Venue venue() {
        EventDTO.Venue venue = new EventDTO.Venue();
        venue.setName("Main Auditorium");
        venue.setCity("Colombo");
        venue.setAddress("Union Place");
        return venue;
    }

    private EventDTO.Link link(String name, String url) {
        EventDTO.Link link = new EventDTO.Link();
        link.setName(name);
        link.setUrl(url);
        return link;
    }

    private EventDTO.EventDate date(String start, String end) {
        EventDTO.EventDate row = new EventDTO.EventDate();
        row.setDate(eventDate.toString());
        row.setStartTime(start);
        row.setEndTime(end);
        return row;
    }
}
