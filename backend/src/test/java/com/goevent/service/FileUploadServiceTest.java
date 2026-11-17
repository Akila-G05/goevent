package com.goevent.service;

import com.goevent.exception.ImageException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import java.nio.file.Files;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;

class FileUploadServiceTest {

    @TempDir
    Path root;

    private FileUploadService service() {
        return new FileUploadService(root.toString(), "/goevent/api/images");
    }

    private static MockMultipartFile png() {
        return new MockMultipartFile("file", "photo.exe", "image/png", new byte[]{1, 2, 3});
    }

    @Test void savesUnderScopeAndOwnerAndReturnsThePublicUrl() {
        String url = service().uploadFile(FileUploadService.SCOPE_EVENT, 42, png());

        assertTrue(url.matches("^/goevent/api/images/event/42/[0-9a-f-]{36}\\.png$"), url);
        assertTrue(Files.isRegularFile(root.resolve("event/42").resolve(url.substring(url.lastIndexOf('/') + 1))));
    }

    @Test void rejectsAnEmptyFileAndANonImageType() {
        var files = service();
        var empty = new MockMultipartFile("file", "photo.png", "image/png", new byte[0]);
        var text = new MockMultipartFile("file", "notes.txt", "text/plain", new byte[]{1});

        ImageException emptyError = assertThrows(ImageException.class,
                () -> files.uploadFile(FileUploadService.SCOPE_PROFILE, 1, empty));
        ImageException typeError = assertThrows(ImageException.class,
                () -> files.uploadFile(FileUploadService.SCOPE_PROFILE, 1, text));

        assertEquals(HttpStatus.BAD_REQUEST, emptyError.status());
        assertEquals(HttpStatus.BAD_REQUEST, typeError.status());
    }

    @Test void servesStoredFilesAndRefusesPathTricks() {
        var files = service();
        String url = files.uploadFile(FileUploadService.SCOPE_PROFILE, 7, png());
        String fileName = url.substring(url.lastIndexOf('/') + 1);

        assertTrue(files.findFile(FileUploadService.SCOPE_PROFILE, "7", fileName).isPresent());
        assertTrue(files.findFile(FileUploadService.SCOPE_PROFILE, "7", "../../secret.png").isEmpty());
        assertTrue(files.findFile("unknown", "7", fileName).isEmpty());
    }

    @Test void deletesOwnFilesAndIgnoresExternalUrls() {
        var files = service();
        String url = files.uploadFile(FileUploadService.SCOPE_EVENT, 3, png());
        Path stored = root.resolve("event/3").resolve(url.substring(url.lastIndexOf('/') + 1));

        files.deleteFile(FileUploadService.SCOPE_EVENT, "https://lh3.googleusercontent.com/avatar.png");
        assertTrue(Files.exists(stored));

        files.deleteFile(FileUploadService.SCOPE_EVENT, url);
        assertFalse(Files.exists(stored));
    }

    @Test void recognisesOnlyUrlsItStored() {
        var files = service();
        String url = files.uploadFile(FileUploadService.SCOPE_PROFILE, 5, png());

        assertTrue(files.isOwnUrl(FileUploadService.SCOPE_PROFILE, url));
        assertFalse(files.isOwnUrl(FileUploadService.SCOPE_EVENT, url));
        assertFalse(files.isOwnUrl(FileUploadService.SCOPE_PROFILE, "https://example.invalid/a.png"));
    }
}
