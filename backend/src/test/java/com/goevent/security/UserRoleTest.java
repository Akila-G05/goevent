package com.goevent.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class UserRoleTest {

    @Test
    @DisplayName("Should strip ROLE_ prefix correctly")
    void testRoleNameWithoutPrefix() {
        assertEquals("VIEWER", UserRole.ROLE_VIEWER.roleNameWithoutPrefix());
        assertEquals("CREATOR", UserRole.ROLE_CREATOR.roleNameWithoutPrefix());
        assertEquals("ADMIN", UserRole.ROLE_ADMIN.roleNameWithoutPrefix());
    }
}
