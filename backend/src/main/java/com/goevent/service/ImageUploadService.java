package com.goevent.service;

import com.goevent.config.FileStorageConfig;
import com.goevent.config.FileStorageConfig.ImagePolicy;
import com.goevent.config.FileStorageConfig.StorageSettings;
import com.goevent.exception.ImageStorageException;
import com.goevent.exception.InvalidImageException;
import com.goevent.util.AppUtil;
import org.slf4j.Logger;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * All image file operations for the platform. Controllers and feature
 * services call this class and then persist the returned public path in
 * MySQL; nothing else touches the filesystem.
 *
 * <p>Storage location, folders, filename prefixes, allowed formats and size
 * limits all come from {@link FileStorageConfig}, so switching to cloud
 * storage is a configuration change plus a new storage implementation here.</p>
 */
@Service
public class ImageUploadService {

    private static final Logger logger = AppUtil.getLogger(ImageUploadService.class);

    /** Profile URLs created before images moved to the shared /images route. */
    private static final String LEGACY_PROFILE_PREFIX = "/goevent/api/user/image/";

    private static final int MAGIC_HEADER_BYTES = 12;

    private static final Pattern MANAGED_FILENAME = Pattern.compile(
            "^[a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$"
    );

    private final StorageSettings settings;

    public ImageUploadService(StorageSettings settings) {
        this.settings = settings;
    }

    /** A stored image ready to be served. */
    public record StoredImage(Resource resource, MediaType mediaType) {
    }

    private record DetectedImage(String extension, String contentType) {
    }

    public String uploadProfilePicture(MultipartFile file) {
        return uploadImage(FileStorageConfig.SCOPE_PROFILE, file);
    }

    public String uploadEventImage(MultipartFile file) {
        return uploadImage(FileStorageConfig.SCOPE_EVENT, file);
    }

    public String uploadEventBanner(MultipartFile file) {
        return uploadImage(FileStorageConfig.SCOPE_BANNER, file);
    }

    /**
     * Validates and stores an image using the policy configured for the scope,
     * then returns the public URL that should be persisted in MySQL.
     */
    public String uploadImage(String scope, MultipartFile file) {

        ImagePolicy policy = settings.policy(scope);
        DetectedImage detected = detectAndValidate(scope, file);

        String filename =
                policy.filenamePrefix() + "-" + UUID.randomUUID() + "." + detected.extension();

        Path root = settings.root();
        Path directory = root.resolve(policy.directory()).normalize();
        Path target = directory.resolve(filename).normalize();

        if (!target.startsWith(root)) {
            throw new ImageStorageException("Could not resolve the image storage location");
        }

        try {
            Files.createDirectories(directory);

            try (InputStream input = file.getInputStream()) {
                // No REPLACE_EXISTING: an (extremely unlikely) UUID clash must
                // fail instead of overwriting somebody else's image.
                Files.copy(input, target);
            }
        } catch (IOException e) {
            deleteQuietly(target);
            logger.error(
                    "Failed to store a {} image ({} bytes) in {}",
                    scope,
                    file.getSize(),
                    directory,
                    e
            );
            throw new ImageStorageException("Could not save the image. Please try again.");
        }

        logger.info("Stored {} image {} ({} bytes)", scope, target, file.getSize());

        return settings.publicPath(scope, filename);
    }

    /**
     * Validates format and size for a scope without storing anything. Useful
     * when a feature wants to reject a file before collecting the rest of a
     * form (for example event creation).
     */
    public void validateImage(String scope, MultipartFile file) {
        detectAndValidate(scope, file);
    }

    public boolean deleteImage(String scope, String filename) {

        if (!settings.hasScope(scope) || !isManagedFilename(settings.policy(scope), filename)) {
            return false;
        }

        Path target = pathFor(scope, filename);

        if (!target.startsWith(settings.root())) {
            return false;
        }

        try {
            boolean deleted = Files.deleteIfExists(target);

            if (deleted) {
                logger.info("Deleted {} image {}", scope, target);
            }

            return deleted;
        } catch (IOException e) {
            logger.error("Failed to delete {} image {}", scope, target, e);
            return false;
        }
    }

    /**
     * Deletes the local file behind a previously stored URL. External URLs
     * (for example Google avatars) and unmanaged paths are ignored.
     */
    public boolean deleteByPath(String scope, String storedPath) {

        String filename = filenameFromUrl(scope, storedPath);

        return filename != null && deleteImage(scope, filename);
    }

    /**
     * Loads a stored image for the public read endpoint. Unknown scopes,
     * malformed filenames and missing files all return empty so callers can
     * answer 404 without leaking storage details.
     */
    public Optional<StoredImage> load(String scope, String filename) {

        if (!settings.hasScope(scope) || !isManagedFilename(settings.policy(scope), filename)) {
            return Optional.empty();
        }

        Path target = pathFor(scope, filename);

        if (!target.startsWith(settings.root()) || !Files.isRegularFile(target)) {
            return Optional.empty();
        }

        return Optional.of(
                new StoredImage(new FileSystemResource(target), mediaTypeFor(filename))
        );
    }

    /**
     * True when a URL points at an image managed by this service, in any
     * scope. Used to reject arbitrary client-supplied paths.
     */
    public boolean isManagedUrl(String url) {

        if (url == null || url.isBlank()) {
            return false;
        }

        for (String scope : settings.policies().keySet()) {
            if (url.startsWith(settings.publicScopeUrl(scope))) {
                return true;
            }
        }

        return url.startsWith(LEGACY_PROFILE_PREFIX);
    }

    /**
     * True when a URL points at a stored image of exactly this scope. Prevents
     * a profile picture from being pointed at an event image, which could be
     * deleted later and leave the profile broken.
     */
    public boolean isManagedUrl(String scope, String url) {

        if (!settings.hasScope(scope)) {
            return false;
        }

        String filename = filenameFromUrl(scope, url);

        return filename != null && isManagedFilename(settings.policy(scope), filename);
    }

    private DetectedImage detectAndValidate(String scope, MultipartFile file) {

        ImagePolicy policy = settings.policy(scope);

        if (file == null || file.isEmpty()) {
            throw new InvalidImageException("Please choose an image file");
        }

        if (file.getSize() > policy.maxSizeBytes()) {
            throw new InvalidImageException("Image must be " + policy.maxSizeLabel() + " or smaller");
        }

        DetectedImage detected = detectImage(file);

        if (detected == null) {
            throw new InvalidImageException("Only JPEG, PNG or WebP images are supported");
        }

        if (!policy.allows(detected.contentType())) {
            throw new InvalidImageException(
                    "This image type is not allowed for " + scope + " images"
            );
        }

        logger.debug("Accepted {} image: {} bytes, {}", scope, file.getSize(), detected.contentType());

        return detected;
    }

    /**
     * Detects the real format from magic bytes. The client filename and
     * Content-Type are never trusted.
     */
    private DetectedImage detectImage(MultipartFile file) {

        try (InputStream input = file.getInputStream()) {
            byte[] header = input.readNBytes(MAGIC_HEADER_BYTES);

            if (isJpeg(header)) {
                return new DetectedImage("jpg", "image/jpeg");
            }

            if (isPng(header)) {
                return new DetectedImage("png", "image/png");
            }

            if (isWebp(header)) {
                return new DetectedImage("webp", "image/webp");
            }
        } catch (IOException e) {
            logger.warn("Could not inspect an uploaded image header: {}", e.getMessage());
        }

        return null;
    }

    private boolean isJpeg(byte[] header) {
        return header.length >= 3
                && (header[0] & 0xFF) == 0xFF
                && (header[1] & 0xFF) == 0xD8
                && (header[2] & 0xFF) == 0xFF;
    }

    private boolean isPng(byte[] header) {
        return header.length >= 8
                && (header[0] & 0xFF) == 0x89
                && header[1] == 'P'
                && header[2] == 'N'
                && header[3] == 'G'
                && header[4] == 0x0D
                && header[5] == 0x0A
                && header[6] == 0x1A
                && header[7] == 0x0A;
    }

    private boolean isWebp(byte[] header) {
        return header.length >= MAGIC_HEADER_BYTES
                && header[0] == 'R'
                && header[1] == 'I'
                && header[2] == 'F'
                && header[3] == 'F'
                && header[8] == 'W'
                && header[9] == 'E'
                && header[10] == 'B'
                && header[11] == 'P';
    }

    private Path pathFor(String scope, String filename) {

        return settings.root()
                .resolve(settings.policy(scope).directory())
                .normalize()
                .resolve(filename)
                .normalize();
    }

    /**
     * Accepts only names generated by this service. The prefix check keeps a
     * profile file from being served/deleted through the event scope.
     */
    private boolean isManagedFilename(ImagePolicy policy, String filename) {

        return filename != null
                && MANAGED_FILENAME.matcher(filename).matches()
                && filename.startsWith(policy.filenamePrefix() + "-");
    }

    private String filenameFromUrl(String scope, String url) {

        if (url == null || url.isBlank()) {
            return null;
        }

        String prefix = settings.publicScopeUrl(scope);

        if (url.startsWith(prefix)) {
            return url.substring(prefix.length());
        }

        if (FileStorageConfig.SCOPE_PROFILE.equals(scope) && url.startsWith(LEGACY_PROFILE_PREFIX)) {
            return url.substring(LEGACY_PROFILE_PREFIX.length());
        }

        return null;
    }

    private MediaType mediaTypeFor(String filename) {

        String lower = filename.toLowerCase(Locale.ROOT);

        if (lower.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }

        if (lower.endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        }

        return MediaType.IMAGE_JPEG;
    }

    private void deleteQuietly(Path target) {

        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            logger.warn("Could not clean up a partially written image: {}", target);
        }
    }
}