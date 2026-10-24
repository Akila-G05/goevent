package com.goevent.security;

public enum UserRole {
    ROLE_VIEWER,
    ROLE_CREATOR,
    ROLE_ADMIN;

    public String roleNameWithoutPrefix() {
        return name().substring("ROLE_".length());
    }
}
