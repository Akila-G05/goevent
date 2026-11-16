package com.goevent.model;

import java.util.List;

/** A user who creates and lists events. */
public class Organizer extends User {

    public Organizer(int id, String name, String email, String passwordHash) {
        super(id, name, email, passwordHash);
    }

    @Override
    public String role() {
        return "ORGANIZER";
    }

    @Override
    public List<String> menuOptions() {
        return List.of("Create event", "My events", "Log out");
    }
}
