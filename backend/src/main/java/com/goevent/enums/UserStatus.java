package com.goevent.enums;

public enum UserStatus {

    ACTIVE(1),
    SUSPENDED(2),
    PENDING(3);

    private final int id;

    UserStatus(int id) {
        this.id = id;
    }

    public int getId() {
        return id;
    }

    public static UserStatus fromId(int id) {

        for (UserStatus status : UserStatus.values()) {
            if (status.id == id) {
                return status;
            }
        }

        throw new IllegalArgumentException(
                "Invalid user status ID: " + id
        );
    }
}
