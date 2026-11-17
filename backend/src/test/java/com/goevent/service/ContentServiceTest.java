package com.goevent.service;

import com.goevent.repository.ContentRepo;
import com.goevent.service.content.ContentLoader;
import com.goevent.service.content.loader.CategoryLoader;
import com.goevent.service.content.loader.EventStatusLoader;
import com.goevent.service.content.loader.OrganizationLoader;
import com.goevent.service.content.loader.OrganizationTypeLoader;
import com.goevent.service.content.loader.RoleLoader;
import com.goevent.service.content.loader.UniversityLoader;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ContentServiceTest {

    private static List<ContentLoader> loaders(ContentRepo repo) {
        return List.of(
                new RoleLoader(repo),
                new CategoryLoader(repo),
                new EventStatusLoader(repo),
                new OrganizationTypeLoader(repo),
                new UniversityLoader(repo),
                new OrganizationLoader(repo));
    }

    @Test void initialDataKeepsTheExistingEnvelopeAndKeyOrder() {
        var repo = mock(ContentRepo.class);
        when(repo.getRoles()).thenReturn(List.of(Map.of("id", 1, "type", "USER")));
        when(repo.getCategories()).thenReturn(List.of(Map.of("id", 1, "name", "MUSIC")));
        when(repo.getEventStatuses()).thenReturn(List.of(Map.of("id", 2, "name", "APPROVED")));
        when(repo.getOrganizationTypes()).thenReturn(List.of(Map.of("id", 3, "type", "CLUB")));

        JsonObject body = JsonParser.parseString(new ContentService(loaders(repo)).getInitialData()).getAsJsonObject();

        assertTrue(body.get("status").getAsBoolean());
        assertEquals("Initial content loaded successfully", body.get("message").getAsString());
        assertEquals(List.of("roles", "categories", "eventStatuses", "organizationTypes"),
                body.getAsJsonObject("data").keySet().stream().toList());
        assertEquals("USER", body.getAsJsonObject("data").getAsJsonArray("roles").get(0).getAsJsonObject().get("type").getAsString());
    }

    @Test void singleListUsesItsOwnMessageAndIsReturnedAsData() {
        var repo = mock(ContentRepo.class);
        when(repo.getUniversities()).thenReturn(List.of(Map.of("id", 7, "name", "Example University")));

        JsonObject body = JsonParser.parseString(new ContentService(loaders(repo)).getUniversities()).getAsJsonObject();

        assertTrue(body.get("status").getAsBoolean());
        assertEquals("Universities loaded successfully", body.get("message").getAsString());
        assertEquals("Example University", body.getAsJsonArray("data").get(0).getAsJsonObject().get("name").getAsString());
    }

    @Test void repositoryFailureReturnsStatusFalseWithoutData() {
        var repo = mock(ContentRepo.class);
        when(repo.getOrganizations()).thenThrow(new IllegalStateException("database down"));

        JsonObject body = JsonParser.parseString(new ContentService(loaders(repo)).getOrganizations()).getAsJsonObject();

        assertFalse(body.get("status").getAsBoolean());
        assertEquals("Failed to load organizations", body.get("message").getAsString());
        assertFalse(body.has("data"));
    }

    @Test void duplicateLoaderKeysAreRejectedAtStartup() {
        var repo = mock(ContentRepo.class);
        var duplicate = List.<ContentLoader>of(new RoleLoader(repo), new RoleLoader(repo));

        IllegalStateException error = assertThrows(IllegalStateException.class, () -> new ContentService(duplicate));

        assertEquals("Duplicate content loader: roles", error.getMessage());
    }
}
