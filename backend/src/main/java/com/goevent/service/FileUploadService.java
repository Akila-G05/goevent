
package com.goevent.service;

import com.goevent.exception.ImageException;
import com.goevent.util.AppUtil;

import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class FileUploadService {
    private static final Logger logger = AppUtil.getLogger(FileUploadService.class);

    public static final String SCOPE_PROFILE = "profile";
    public static final String SCOPE_EVENT = "event";
    public static final String SCOPE_BANNER = "banner";

    private static final Set<String> SCOPES = Set.of(SCOPE_PROFILE, SCOPE_EVENT, SCOPE_BANNER);

    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp"
    );

    private static final Pattern OWNER = Pattern.compile("\\d{1,10}");
    private static final Pattern FILE_NAME = Pattern.compile("[0-9a-f-]{36}\\.(jpg|png|webp)");

    private final Path root;
    private final String publicBaseUrl;

    public FileUploadService(
            @Value("${app.storage.root}") String root,
            @Value("${app.storage.public-base-url}") String publicBaseUrl) {

        this.root = Path.of(root).toAbsolutePath().normalize();
        this.publicBaseUrl = publicBaseUrl;
    }

    // Upload image
    public String uploadFile(String scope, int ownerId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ImageException(
                    HttpStatus.BAD_REQUEST,
                    "Please choose an image file"
            );
        }

        if (!SCOPES.contains(scope)) {
            throw new IllegalArgumentException("Invalid image scope");
        }

        String extension = EXTENSIONS.get(file.getContentType());

        if (extension == null) {
            throw new ImageException(
                    HttpStatus.BAD_REQUEST,
                    "Only JPEG, PNG or WebP images are supported"
            );
        }

        String owner = String.valueOf(ownerId);
        String fileName = UUID.randomUUID() + "." + extension;

        try {
            Path directory = folder(scope, owner);

            Files.createDirectories(directory);
            Files.copy(file.getInputStream(), directory.resolve(fileName));

        } catch (IOException e) {
            logger.error("Failed to upload image", e);

            throw new ImageException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not save the image. Please try again."
            );
        }

        return publicBaseUrl + "/" + scope + "/" + owner + "/" + fileName;
    }

    // Find image
    public Optional<Resource> findFile(
            String scope, String owner, String fileName) {

        if (!SCOPES.contains(scope)
                || owner == null
                || fileName == null
                || !OWNER.matcher(owner).matches()
                || !FILE_NAME.matcher(fileName).matches()) {

            return Optional.empty();
        }

        Path file = folder(scope, owner).resolve(fileName);

        return Files.isRegularFile(file)
                ? Optional.of(new FileSystemResource(file))
                : Optional.empty();
    }

    // Check whether URL belongs to this service
    public boolean isOwnUrl(String scope, String url) {
        return ownedParts(scope, url) != null;
    }

    // Delete uploaded image
    public void deleteFile(String scope, String url) {

        String[] parts = ownedParts(scope, url);

        if (parts == null) {
            return;
        }

        try {
            Files.deleteIfExists(
                    folder(scope, parts[0]).resolve(parts[1])
            );

        } catch (IOException e) {
            logger.error("Failed to delete image", e);
        }
    }

    // Get storage folder
    private Path folder(String scope, String owner) {

        if (!SCOPES.contains(scope)) {
            throw new IllegalArgumentException("Invalid image scope");
        }

        return root.resolve(scope).resolve(owner);
    }

    // Extract owner and filename from stored URL
    private String[] ownedParts(String scope, String url) {

        if (url == null || !SCOPES.contains(scope)) {
            return null;
        }

        String prefix = publicBaseUrl + "/" + scope + "/";

        if (!url.startsWith(prefix)) {
            return null;
        }

        String[] parts = url.substring(prefix.length()).split("/");

        if (parts.length != 2
                || !OWNER.matcher(parts[0]).matches()
                || !FILE_NAME.matcher(parts[1]).matches()) {

            return null;
        }

        return parts;
    }
}
