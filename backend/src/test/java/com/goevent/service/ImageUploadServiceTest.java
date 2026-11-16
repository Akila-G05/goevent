package com.goevent.service;

import com.goevent.config.FileStorageConfig.StorageSettings;
import com.goevent.exception.ImageException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import java.nio.file.*;
import java.nio.file.attribute.PosixFilePermissions;
import static org.junit.jupiter.api.Assertions.*;

class ImageUploadServiceTest {
    @TempDir Path temporary;
    private static final String NAME = "11111111-1111-1111-1111-111111111111.png";
    private ImageUploadService service(Path root) {
        return new ImageUploadService(new StorageSettings(root, "/goevent/api/images"));
    }
    private MockMultipartFile image() {
        return new MockMultipartFile("file", "ignored-name.png", "image/png",
            new byte[]{(byte)137,80,78,71,13,10,26,10});
    }
    @Test void replacementServiceReadsExistingPrivateFilesWithoutDirectoryBrowsing() throws Exception {
        Path root = temporary.resolve("uploads");
        String url = service(root).uploadProfilePicture(7,image());
        String name = url.substring(url.lastIndexOf('/')+1);
        var replacement = service(root);
        var resource = replacement.load("profile","7",name).orElseThrow();
        assertArrayEquals(image().getBytes(),resource.getInputStream().readAllBytes());
        assertEquals(PosixFilePermissions.fromString("rw-------"),Files.getPosixFilePermissions(root.resolve("profile/7/"+name)));
        assertEquals(PosixFilePermissions.fromString("rwx------"),Files.getPosixFilePermissions(root.resolve("profile/7")));
        assertTrue(replacement.load("profile","7","..").isEmpty());
        assertTrue(replacement.load("profile","../outside",name).isEmpty());
        assertTrue(replacement.load("private","7",name).isEmpty());
    }
    @Test void symlinkDirectoriesAndFilesCannotBeReadWrittenOrDeleted() throws Exception {
        Path root = temporary.resolve("uploads"), outside = temporary.resolve("outside");
        Files.createDirectories(root); Files.createDirectories(outside);
        Files.write(outside.resolve(NAME),image().getBytes());
        Files.createSymbolicLink(root.resolve("profile"),outside);
        var service = service(root);
        assertThrows(ImageException.class,()->service.uploadProfilePicture(7,image()));
        assertTrue(service.load("profile","7",NAME).isEmpty());
        assertFalse(service.deleteImage("profile","7",NAME));
        Files.delete(root.resolve("profile")); Files.createDirectories(root.resolve("profile/7"));
        Files.createSymbolicLink(root.resolve("profile/7/"+NAME),outside.resolve(NAME));
        assertTrue(service.load("profile","7",NAME).isEmpty());
        assertFalse(service.deleteImage("profile","7",NAME));
        assertTrue(Files.exists(outside.resolve(NAME)));
        Files.createSymbolicLink(temporary.resolve("linked-root"),root);
        assertThrows(ImageException.class,()->service(temporary.resolve("linked-root")).uploadProfilePicture(7,image()));
    }
}
