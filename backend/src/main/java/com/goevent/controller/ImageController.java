package com.goevent.controller;

import com.goevent.service.ImageUploadService;
import com.goevent.service.ImageUploadService.StoredImage;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.Optional;

/**
 * Public read endpoint for every stored image. Filenames are random UUIDs and
 * never change, so they are cached as immutable by browsers and CDNs.
 */
@RestController
@RequestMapping("/images")
public class ImageController {

    private final ImageUploadService imageUploadService;

    public ImageController(ImageUploadService imageUploadService) {
        this.imageUploadService = imageUploadService;
    }

    @GetMapping("/{scope}/{filename}")
    public ResponseEntity<Resource> image(
            @PathVariable String scope,
            @PathVariable String filename
    ) {

        Optional<StoredImage> stored = imageUploadService.load(scope, filename);

        if (stored.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        return imageResponse(stored.get());
    }

    /** Shared by the generic route and the legacy profile image route. */
    public static ResponseEntity<Resource> imageResponse(StoredImage image) {

        return ResponseEntity.ok()
                .contentType(image.mediaType())
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .body(image.resource());
    }
}