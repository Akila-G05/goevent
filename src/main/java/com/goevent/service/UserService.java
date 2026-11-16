package com.goevent.service;

import com.goevent.exception.UnauthorizedException;
import com.goevent.exception.ValidationException;
import com.goevent.model.Organizer;
import com.goevent.model.User;
import com.goevent.model.Viewer;
import com.goevent.repository.UserRepository;
import com.goevent.util.PasswordHasher;
import com.goevent.util.Validation;

public class UserService {

    private static final int MIN_PASSWORD_LENGTH = 6;

    private final UserRepository users;

    public UserService(UserRepository users) {
        this.users = users;
    }

    public Organizer registerOrganizer(String name, String email, String password) {
        requireNewAccount(email, password);
        Organizer organizer = new Organizer(users.nextId(), name, email, PasswordHasher.hash(password));
        users.save(organizer);
        return organizer;
    }

    public Viewer registerViewer(String name, String email, String password) {
        requireNewAccount(email, password);
        Viewer viewer = new Viewer(users.nextId(), name, email, PasswordHasher.hash(password));
        users.save(viewer);
        return viewer;
    }

    public User login(String email, String password) {
        String address = Validation.requireText(email, "Email");
        String secret = Validation.requireText(password, "Password");
        return users.findByEmail(address)
                .filter(user -> user.checkPassword(secret))
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password."));
    }

    private void requireNewAccount(String email, String password) {
        Validation.requireText(email, "Email");
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw new ValidationException("Password must be at least " + MIN_PASSWORD_LENGTH + " characters.");
        }
        if (users.findByEmail(email.trim()).isPresent()) {
            throw new ValidationException("An account with this email already exists.");
        }
    }
}
