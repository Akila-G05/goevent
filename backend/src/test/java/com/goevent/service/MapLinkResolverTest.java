package com.goevent.service;

import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MapLinkResolverTest {

    @Test
    void readsThePinPositionFromAnExpandedPlaceLink() {
        String expanded = "https://www.google.com/maps/place/Eheliyagoda/@6.85668,80.2377414,14z/"
                + "data=!3m1!4b1!4m6!3m5!1s0x3ae3af8b532ab8bd:0x374fc03d3afa85d3!8m2!3d6.8508767!4d80.2641585";

        assertEquals(Optional.of("6.8508767,80.2641585"), MapLinkResolver.parseCoordinates(expanded));
    }

    @Test
    void fallsBackToTheViewportCentre() {
        Optional<String> coordinates = MapLinkResolver.parseCoordinates(
                "https://www.google.com/maps/@6.85668,80.2377414,14z");

        assertEquals(Optional.of("6.85668,80.2377414"), coordinates);
    }

    @Test
    void returnsEmptyWhenTheLinkHasNoCoordinates() {
        assertTrue(MapLinkResolver.parseCoordinates("https://www.google.com/maps/search/online").isEmpty());
    }

    @Test
    void ignoresLinksThatAreNotGoogleShortLinks() {
        MapLinkResolver resolver = new MapLinkResolver();

        assertTrue(resolver.coordinatesFor("http://example.com/x").isEmpty());
        assertTrue(resolver.coordinatesFor("https://evil.example.com/maps").isEmpty());
        assertTrue(resolver.coordinatesFor(null).isEmpty());
    }
}
