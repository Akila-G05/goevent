package com.goevent.exception;

import com.goevent.common.ApiResponse;
import com.goevent.util.AppUtil;
import org.slf4j.Logger;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

/**
 * Turns image failures into the {@code {status, message}} JSON used by the
 * rest of the API, and writes every rejection or failure to the application
 * log. Responses never include paths, stack traces or storage details.
 */
@RestControllerAdvice
public class ImageExceptionHandler {

    private static final Logger logger = AppUtil.getLogger(ImageExceptionHandler.class);

    @ExceptionHandler(ImageException.class)
    public ResponseEntity<String> handleImageException(ImageException e) {

        if (e.status().is5xxServerError()) {
            logger.error("Image storage failure: {}", e.getMessage(), e);
        } else {
            logger.warn("Image upload rejected: {}", e.getMessage());
        }

        return ApiResponse.error(e.status(), e.getMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<String> handleOversizedUpload(MaxUploadSizeExceededException e) {

        logger.warn("Upload rejected by the multipart size limit: {}", e.getMessage());

        return ApiResponse.error(HttpStatus.CONTENT_TOO_LARGE,
                "The image is too large. Please choose a smaller file.");
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<String> handleMissingFile(MissingServletRequestPartException e) {

        logger.warn("Upload rejected because the file part was missing: {}", e.getMessage());

        return ApiResponse.error(HttpStatus.BAD_REQUEST, "Please choose an image file");
    }
}