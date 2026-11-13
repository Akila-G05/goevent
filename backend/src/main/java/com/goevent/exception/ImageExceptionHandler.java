package com.goevent.exception;

import com.goevent.util.AppUtil;
import com.google.gson.JsonObject;
import org.slf4j.Logger;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

/**
 * Turns image failures into the same {@code {status, message}} JSON used by
 * the rest of the API. Every rejection and failure is also written to the
 * application log so operators can see abuse and disk problems; client
 * responses never include paths, stack traces or storage details.
 */
@RestControllerAdvice
public class ImageExceptionHandler {

    private static final Logger logger = AppUtil.getLogger(ImageExceptionHandler.class);

    @ExceptionHandler(InvalidImageException.class)
    public ResponseEntity<String> handleInvalidImage(InvalidImageException e) {

        logger.warn("Image upload rejected: {}", e.getMessage());

        return json(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(ImageStorageException.class)
    public ResponseEntity<String> handleStorageFailure(ImageStorageException e) {

        logger.error("Image storage failure: {}", e.getMessage(), e);

        return json(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<String> handleOversizedUpload(MaxUploadSizeExceededException e) {

        logger.warn("Upload rejected by the multipart size limit: {}", e.getMessage());

        return json(HttpStatus.CONTENT_TOO_LARGE, "The image is too large. Please choose a smaller file.");
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<String> handleMissingFile(MissingServletRequestPartException e) {

        logger.warn("Upload rejected because the file part was missing: {}", e.getMessage());

        return json(HttpStatus.BAD_REQUEST, "Please choose an image file");
    }

    private ResponseEntity<String> json(HttpStatus status, String message) {

        JsonObject body = new JsonObject();

        body.addProperty("status", false);
        body.addProperty("message", message);

        return ResponseEntity
                .status(status)
                .contentType(MediaType.APPLICATION_JSON)
                .body(AppUtil.gson.toJson(body));
    }
}