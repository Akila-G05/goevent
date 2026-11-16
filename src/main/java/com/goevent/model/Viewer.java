package com.goevent.model;

import java.util.List;

/** A user who browses events and books tickets. */
public class Viewer extends User {

    public Viewer(int id, String name, String email, String passwordHash) {
        super(id, name, email, passwordHash);
    }

    @Override
    public String role() {
        return "VIEWER";
    }

    @Override
    public List<String> menuOptions() {
        return List.of("Browse events", "Book tickets", "My bookings", "Log out");
    }
}
