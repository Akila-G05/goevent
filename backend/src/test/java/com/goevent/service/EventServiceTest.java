package com.goevent.service;

import com.goevent.dto.EventDTO;
import com.goevent.dto.EventDetails;
import com.goevent.dto.EventSummary;
import com.goevent.enums.Status;
import com.goevent.exception.EventException;
import com.goevent.repository.EventRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EventServiceTest {

    private static final ZoneId UTC = ZoneId.of("UTC");

    private EventRepo repo;
    private ImageUploadService images;
    private EventService service;
    private MockHttpServletRequest request;
    private LocalDate eventDate;

    @BeforeEach
    void setUp() {
        repo = mock(EventRepo.class);
        images = mock(ImageUploadService.class);
        service = new EventService(repo, images);
        request = new MockHttpServletRequest();
        eventDate = LocalDate.now(UTC).plusDays(30);

        when(repo.account(7)).thenReturn(Map.of("role_id", 2, "user_status_id", 1));
        when(repo.categoryId("Technology")).thenReturn(Optional.of(2));
        when(repo.audienceId("University")).thenReturn(Optional.of(1));
        when(repo.tagId("Technology")).thenReturn(Optional.of(7));
        when(repo.insertVenue(anyString(), any(), anyString(), any())).thenReturn(41L);
        when(repo.insertLink(anyString(), anyString())).thenReturn(51L, 52L);
        when(repo.insertEvent(anyString(), any(), anyInt(), anyLong(), anyInt(), anyInt(), anyInt(),
                any(), anyInt(), any(), any())).thenReturn(99L);
    }

    @Test
    void rejectsAnAnonymousRequest() {
        EventException error = assertThrows(EventException.class,
                () -> service.create(validPayload(), request));

        assertEquals(HttpStatus.UNAUTHORIZED, error.status());
        verify(repo, never()).insertEvent(anyString(), any(), anyInt(), anyLong(), anyInt(),
                anyInt(), anyInt(), any(), anyInt(), any(), any());
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
    void storesNewEventsWithTheApprovedStatus() {
        signedIn(7);

        service.create(validPayload(), request);

        ArgumentCaptor<Integer> status = ArgumentCaptor.forClass(Integer.class);
        verify(repo).insertEvent(anyString(), any(), anyInt(), anyLong(), status.capture(),
                anyInt(), anyInt(), any(), anyInt(), any(), any());
        assertEquals(Status.APPROVED.getId(), status.getValue());
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
                eq("Tech Fest 2026"), eq("Design preview"), eq(2), eq(41L),
                eq(Status.APPROVED.getId()), eq(1), eq(1), eq(51L),
                eq(7), any(), any());

        verify(repo).attachTag(99L, 7);
    }

    @Test
    void storesTheCoverImageOnTheEvent() {
        signedIn(7);

        Map<String, Object> row = new HashMap<>();
        row.put("published_by", 7);
        row.put("img_id", null);

        when(repo.eventImageRow(99L)).thenReturn(row);
        when(repo.insertImage(anyString(), isNull())).thenReturn(5L);
        when(images.uploadEventImage(eq(99), any()))
                .thenReturn("/goevent/api/images/event/99/cover.png");

        Map<String, Object> result = service.attachImage(
                99L, imageFile(), null, request);

        assertEquals("/goevent/api/images/event/99/cover.png", result.get("imagePath"));
        verify(repo).setEventImage(99L, 5L);
    }

    @Test
    void rejectsAnImageUploadForAnotherOrganizersEvent() {
        signedIn(7);

        Map<String, Object> row = new HashMap<>();
        row.put("published_by", 8);
        row.put("img_id", null);

        when(repo.eventImageRow(99L)).thenReturn(row);

        EventException error = assertThrows(EventException.class,
                () -> service.attachImage(99L, imageFile(), null, request));

        assertEquals(HttpStatus.FORBIDDEN, error.status());
        verify(images, never()).uploadEventImage(anyInt(), any());
    }

    @Test
    void listsApprovedEventsAsSummariesAndCapsTheLimit() {
        Map<String, Object> row = new HashMap<>();
        row.put("id", 9);
        row.put("name", "Tech Fest");
        row.put("description", "Talks");
        row.put("category", "TECHNOLOGY");
        row.put("audience", "BOTH");
        row.put("event_level", "FREE");
        row.put("venue_name", "Hall A");
        row.put("venue_city", "Colombo");
        row.put("image_path", null);
        row.put("starts_on", java.sql.Date.valueOf("2027-05-01"));
        row.put("time_range", "10:00 - 12:00");

        when(repo.approvedEvents(Status.APPROVED.getId(), 50)).thenReturn(List.of(row));

        List<EventSummary> events = service.listApproved(500);

        assertEquals(1, events.size());
        EventSummary summary = events.get(0);
        assertEquals(9, summary.id());
        assertEquals("FREE", summary.eventLevel());
        assertEquals("BOTH", summary.audience());
        assertEquals("2027-05-01", summary.startsOn());
        assertEquals("10:00 - 12:00", summary.timeRange());
        assertNull(summary.imagePath());
    }

    @Test
    void returnsTheApprovedEventWithItsDatesLinksAndTags() {
        Map<String, Object> row = new HashMap<>();
        row.put("id", 9);
        row.put("name", "Tech Fest");
        row.put("description", "Talks");
        row.put("category", "TECHNOLOGY");
        row.put("audience", "PUBLIC");
        row.put("event_level", "LISTING_ONLY");
        row.put("venue_name", "Hall A");
        row.put("venue_address", "1 Road");
        row.put("venue_city", "Colombo");
        row.put("venue_link", null);
        row.put("image_path", null);
        row.put("banner_path", null);
        row.put("organizer_name", "Akila Gimhana");
        row.put("organizer_since", 2026);

        when(repo.approvedEventRow(9L, Status.APPROVED.getId())).thenReturn(row);
        when(repo.eventDateRows(9L)).thenReturn(List.of(
                Map.of("date", java.sql.Date.valueOf("2027-05-01"), "time", "10:00 - 12:00")));
        when(repo.eventLinkRows(9L)).thenReturn(List.of(
                Map.of("link_name", "Website", "link", "https://example.com")));
        when(repo.eventTagNames(9L)).thenReturn(List.of("AI"));

        EventDetails event = service.detail(9L);

        assertEquals("Hall A", event.venue().name());
        assertEquals("Akila Gimhana", event.organizer().name());
        assertEquals("2026", event.organizer().memberSince());
        assertEquals("2027-05-01", event.dates().get(0).date());
        assertEquals("Website", event.links().get(0).name());
        assertEquals(List.of("AI"), event.tags());
    }

    @Test
    void reportsAMissingOrUnapprovedEventAsNotFound() {
        when(repo.approvedEventRow(anyLong(), anyInt())).thenReturn(null);

        EventException error = assertThrows(EventException.class, () -> service.detail(404L));

        assertEquals(HttpStatus.NOT_FOUND, error.status());
    }

    // --- fixtures --------------------------------------------------------

    private void signedIn(int userId) {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("userId", userId);
        request.setSession(session);
    }

    private MockMultipartFile imageFile() {
        return new MockMultipartFile("file", "cover.png", "image/png", new byte[]{1, 2, 3});
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
