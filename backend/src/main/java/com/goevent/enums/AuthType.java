package com.goevent.enums;

public enum AuthType {

    GOOGLE(1),
    MANUAL(2);

    private final int id;

    AuthType(int id) {
        this.id = id;
    }

    public int getId() {
        return id;
    }

    public static AuthType fromId(int id) {
        for (AuthType authType : AuthType.values()) {
            if (authType.id == id) {
                return authType;
            }
        }

        throw new IllegalArgumentException(
                "Invalid auth type ID: " + id
        );
    }
}
