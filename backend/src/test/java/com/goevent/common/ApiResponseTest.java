package com.goevent.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ApiResponseTest {

    @Test
    @DisplayName("Should create successful response with data")
    void testSuccessWithData() {
        String testData = "payload";
        ApiResponse<String> response = ApiResponse.success(testData);

        assertTrue(response.success());
        assertEquals(testData, response.data());
        assertEquals("Operation successful", response.message());
        assertNull(response.errorCode());
        assertNotNull(response.timestamp());
    }

    @Test
    @DisplayName("Should create error response with error code")
    void testErrorResponse() {
        ApiResponse<Void> response = ApiResponse.error("Not found", "NOT_FOUND");

        assertFalse(response.success());
        assertNull(response.data());
        assertEquals("Not found", response.message());
        assertEquals("NOT_FOUND", response.errorCode());
        assertNotNull(response.timestamp());
    }
}
