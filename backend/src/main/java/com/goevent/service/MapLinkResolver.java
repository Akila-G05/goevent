package com.goevent.service;

import com.goevent.util.AppUtil;
import org.slf4j.Logger;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Turns a saved Google Maps short link into the coordinates of the place it
 * points to, so the event page can embed the exact location. Only Google short
 * links are followed. Any failure yields empty and the page falls back to the
 * venue address.
 */
@Component
public class MapLinkResolver {

    private static final Logger logger = AppUtil.getLogger(MapLinkResolver.class);

    private static final Set<String> SHORT_LINK_HOSTS = Set.of("maps.app.goo.gl", "goo.gl");

    /** The pin position, e.g. {@code !3d6.8508767!4d80.2641585}. */
    private static final Pattern PIN = Pattern.compile("!3d(-?\\d+\\.\\d+)!4d(-?\\d+\\.\\d+)");

    /** The viewport centre, e.g. {@code @6.85668,80.2377414,14z}. */
    private static final Pattern VIEWPORT = Pattern.compile("@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)");

    private final HttpClient client = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(4))
            .build();

    private final Map<String, String> cache = new ConcurrentHashMap<>();

    /** Latitude,longitude for a saved Google link, when it can be resolved. */
    public Optional<String> coordinatesFor(String link) {
        if (link == null || link.isBlank()) {
            return Optional.empty();
        }

        String cached = cache.get(link);

        if (cached != null) {
            return Optional.of(cached);
        }

        Optional<String> resolved = resolve(link.trim());
        resolved.ifPresent(value -> cache.put(link, value));

        return resolved;
    }

    private Optional<String> resolve(String link) {
        URI uri;

        try {
            uri = URI.create(link);
        } catch (IllegalArgumentException error) {
            return Optional.empty();
        }

        if (!"https".equalsIgnoreCase(uri.getScheme())
                || uri.getHost() == null
                || !SHORT_LINK_HOSTS.contains(uri.getHost().toLowerCase())) {
            return Optional.empty();
        }

        try {
            HttpResponse<Void> response = client.send(
                    HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(6)).GET().build(),
                    HttpResponse.BodyHandlers.discarding());

            return parseCoordinates(response.uri().toString());
        } catch (IOException error) {
            logger.warn("Could not resolve a saved map link: {}", error.getMessage());
            return Optional.empty();
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        }
    }

    static Optional<String> parseCoordinates(String url) {
        Matcher pin = PIN.matcher(url);

        if (pin.find()) {
            return Optional.of(pin.group(1) + "," + pin.group(2));
        }

        Matcher viewport = VIEWPORT.matcher(url);

        if (viewport.find()) {
            return Optional.of(viewport.group(1) + "," + viewport.group(2));
        }

        return Optional.empty();
    }
}
