package com.goevent.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Path;
import java.util.Map;
import java.util.Set;

/**
 * Single place for every image storage decision: where files live, which
 * folder and filename prefix each image type uses, which formats are accepted
 * and how large they may be, plus the public URL base stored in MySQL.
 *
 * <p>Moving to cloud storage later only requires changing this configuration
 * (root and public base URL) and the storage calls inside
 * {@code ImageUploadService}; no controller, service or database change.</p>
 */
@Configuration
public class FileStorageConfig {

    public static final String SCOPE_PROFILE = "profile";
    public static final String SCOPE_EVENT = "event";
    public static final String SCOPE_BANNER = "banner";

    private static final Set<String> IMAGE_TYPES =
            Set.of("image/jpeg", "image/png", "image/webp");

    /**
     * Per-image-type storage rules. The filename prefix makes stored files
     * self-describing while the UUID keeps them unguessable.
     */
    public record ImagePolicy(
            String directory,
            String filenamePrefix,
            Set<String> allowedContentTypes,
            long maxSizeBytes
    ) {

        public boolean allows(String contentType) {
            return contentType != null && allowedContentTypes.contains(contentType);
        }

        public String maxSizeLabel() {
            return (maxSizeBytes / (1024 * 1024)) + " MB";
        }
    }

    /**
     * Resolved storage configuration. Injected wherever images are handled so
     * no other class needs to know about folders or URL formats.
     */
    public record StorageSettings(
            Path root,
            String publicBaseUrl,
            Map<String, ImagePolicy> policies
    ) {

        public boolean hasScope(String scope) {
            return scope != null && policies.containsKey(scope);
        }

        public ImagePolicy policy(String scope) {

            ImagePolicy policy = scope != null ? policies.get(scope) : null;

            if (policy == null) {
                throw new IllegalArgumentException("Unknown image scope: " + scope);
            }

            return policy;
        }

        /** Public URL prefix for a scope, always ending with a slash. */
        public String publicScopeUrl(String scope) {
            return normalize(publicBaseUrl) + "/" + scope + "/";
        }

        /** Public URL persisted in MySQL for a stored file. */
        public String publicPath(String scope, String filename) {
            return publicScopeUrl(scope) + filename;
        }

        private String normalize(String value) {

            String normalized = value == null ? "" : value.trim();

            while (normalized.endsWith("/")) {
                normalized = normalized.substring(0, normalized.length() - 1);
            }

            return normalized;
        }
    }

    @Bean
    public Map<String, ImagePolicy> imagePolicies() {

        return Map.of(
                // User profile pictures
                SCOPE_PROFILE,
                new ImagePolicy("profiles", "profile", IMAGE_TYPES, 2L * 1024 * 1024),

                // Event cover images
                SCOPE_EVENT,
                new ImagePolicy("events", "event", IMAGE_TYPES, 5L * 1024 * 1024),

                // Event banners
                SCOPE_BANNER,
                new ImagePolicy("banners", "banner", IMAGE_TYPES, 8L * 1024 * 1024)
        );
    }

    /**
     * Root defaults to a folder outside the repository and build output so
     * cleaning the project never deletes uploaded images. Production should
     * point STORAGE_ROOT at a mounted volume or cloud-synced directory.
     */
    @Bean
    public StorageSettings storageSettings(
            @Value("${app.storage.root:${user.home}/goevent/uploads}") String root,
            @Value("${app.storage.public-base-url:/goevent/api/images}") String publicBaseUrl,
            @Qualifier("imagePolicies") Map<String, ImagePolicy> policies
    ) {

        return new StorageSettings(
                Path.of(root).toAbsolutePath().normalize(),
                publicBaseUrl,
                Map.copyOf(policies)
        );
    }
}