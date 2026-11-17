package com.goevent.enums;

/**
 * Review state of a record that goes through a decision workflow, backed by the
 * shared {@code status} lookup table.
 *
 * <p>Events use {@code PENDING → APPROVED | REJECTED}; {@code DRAFT} is reserved
 * for events the creator has not submitted yet.
 */
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
