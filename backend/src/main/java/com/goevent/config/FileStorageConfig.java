package com.goevent.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Path;
import java.util.Map;
import java.util.Set;

/**
 * Every image storage decision lives here: the root folder, the public URL
 * base, the accepted formats and the per-scope size limits.
 *
 * <p>Files are grouped per owner ({@code profile/13/<uuid>.png},
 * {@code event/42/<uuid>.jpg}) so an owner's images can be removed as a unit.
 * Moving to cloud storage means changing the root/public base here and the
 * file calls in {@code ImageUploadService}; controllers and MySQL are
 * untouched.</p>
 */
@Configuration
public class FileStorageConfig {

    public static final String SCOPE_PROFILE = "profile";
    public static final String SCOPE_EVENT = "event";
    public static final String SCOPE_BANNER = "banner";

    public static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of("image/jpeg", "image/png", "image/webp");

    private static final long MB = 1024L * 1024L;

    private static final Map<String, Long> MAX_SIZE_BY_SCOPE = Map.of(
            SCOPE_PROFILE, 2 * MB,
            SCOPE_EVENT, 5 * MB,
            SCOPE_BANNER, 8 * MB
    );

    /** Resolved storage configuration injected into the image service. */
    public record StorageSettings(Path root, String publicBaseUrl) {

        public boolean isScope(String scope) {
            return scope != null && MAX_SIZE_BY_SCOPE.containsKey(scope);
        }

        public long maxSizeBytes(String scope) {
            Long maxSize = scope != null ? MAX_SIZE_BY_SCOPE.get(scope) : null;

            if (maxSize == null) {
                throw new IllegalArgumentException("Unknown image scope: " + scope);
            }

            return maxSize;
        }

        public String maxSizeLabel(String scope) {
            return (maxSizeBytes(scope) / MB) + " MB";
        }

        /** Public URL prefix for a scope, always ending with a slash. */
        public String publicScopePrefix(String scope) {
            String base = publicBaseUrl == null ? "" : publicBaseUrl.trim();

            while (base.endsWith("/")) {
                base = base.substring(0, base.length() - 1);
            }

            return base + "/" + scope + "/";
        }

        /** Public URL persisted in MySQL for a stored file. */
        public String publicPath(String scope, String owner, String filename) {
            return publicScopePrefix(scope) + owner + "/" + filename;
        }
    }

    /**
     * Root defaults outside the repository and build output so cleaning the
     * project never deletes uploads. Production should point STORAGE_ROOT at
     * a mounted volume or cloud-synced directory.
     */
    @Bean
    public StorageSettings storageSettings(
            @Value("${app.storage.root:${user.home}/goevent/uploads}") String root,
            @Value("${app.storage.public-base-url:/goevent/api/images}") String publicBaseUrl
    ) {
        return new StorageSettings(Path.of(root).toAbsolutePath().normalize(), publicBaseUrl);
    }
}