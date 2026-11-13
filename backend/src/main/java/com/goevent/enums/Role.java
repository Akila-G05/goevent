package com.goevent.enums;

public enum Role {
    USER(1),
    ORGANIZER(2),
    ADMIN(3),
    CONTRIBUTOR(5),
    STUDENT(4);

    private final int id;

    Role(int id) {
        this.id = id;
    }

    public int getId() {
        return id;
    }

    public static Role fromId(int id) {
        for (Role role : Role.values()) {
            if (role.id == id) {
                return role;
            }
        }

        throw new IllegalArgumentException(
                "Invalid role ID: " + id
        );
    }
}
