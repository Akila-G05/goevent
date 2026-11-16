package com.goevent.model;

import com.goevent.util.PasswordHasher;
import com.goevent.util.Validation;

import java.util.List;
import java.util.Objects;

/** Common account data. Each role decides what it can do and which menu it shows. */
public abstract class User {

    private final int id;
    private final String name;
    private final String email;
    private final String passwordHash;

    protected User(int id, String name, String email, String passwordHash) {
        this.id = id;
        this.name = Validation.requireText(name, "Name");
        this.email = Validation.requireText(email, "Email").toLowerCase();
        this.passwordHash = Objects.requireNonNull(passwordHash, "Password hash is required.");
    }

    /** Role code stored in the user file, for example ORGANIZER or VIEWER. */
    public abstract String role();

    /** Menu entries shown after login. The last entry is always "Log out". */
    public abstract List<String> menuOptions();

    public boolean checkPassword(String password) {
        return passwordHash.equals(PasswordHasher.hash(password));
    }

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }
}
