package com.goevent.controller;

import com.goevent.service.FileUploadService;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.Locale;

/**
 * Public read endpoint for uploaded images. Filenames are random UUIDs and
 * never change, so responses are cached as immutable.
 */
@RestController
@RequestMapping("/images")
public class ImageController {

    private static final CacheControl CACHE =
            CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable();

    private final FileUploadService fileUploadService;

    public ImageController(FileUploadService fileUploadService) {
        this.fileUploadService = fileUploadService;
    }

    @GetMapping("/{scope}/{owner}/{filename}")
    public ResponseEntity<Resource> image(
            @PathVariable String scope,
            @PathVariable String owner,
            @PathVariable String filename
    ) {
        return fileUploadService.findFile(scope, owner, filename)
                .map(resource -> ResponseEntity.ok()
                        .contentType(mediaTypeFor(filename))
                        .cacheControl(CACHE)
                        .body(resource))
                .orElseGet(() -> ResponseEntity.notFound().<Resource>build());
    }

    private static MediaType mediaTypeFor(String filename) {

        String name = filename.toLowerCase(Locale.ROOT);

        if (name.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }

        if (name.endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        }

        return MediaType.IMAGE_JPEG;
    }
}
