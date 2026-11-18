package com.goevent.enums;

public enum Status {

    PENDING(1),
    APPROVED(2),
    REJECTED(3),
    DRAFT(4);

    private final int id;

    Status(int id) {
        this.id = id;
    }

    public int getId() {
        return id;
    }

    public static Status fromId(int id) {

        for (Status status : Status.values()) {
            if (status.id == id) {
                return status;
            }
        }

        throw new IllegalArgumentException(
                "Invalid status ID: " + id
        );
    }
}
