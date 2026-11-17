package com.goevent.service;

import com.goevent.dto.UserDTO;
import com.goevent.enums.Role;
import com.goevent.repository.AuthenticationRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Short DB-only transaction; Google verification and password hashing happen first. */
@Service
public class RegistrationService {
    private final AuthenticationRepo users;
    public RegistrationService(AuthenticationRepo users) { this.users = users; }
    public record Input(String firstName, String lastName, String email, String passwordHash,
                        String googleSubject, String image, Role role, Integer organization, String position) {}
    @Transactional
    public UserDTO register(Input input) {
        if (input.role() != Role.USER && input.role() != Role.ORGANIZER)
            throw new IllegalArgumentException("Choose User or Organizer");
        if (input.role() == Role.ORGANIZER && (input.organization() == null || input.position() == null
            || input.position().isBlank() || input.position().length() > 45 || !users.organizationExists(input.organization())))
            throw new IllegalArgumentException("Select an organization and enter your position");
        int count = input.googleSubject() == null
            ? users.registerManualUser(input.firstName(), input.lastName(), input.email(), input.passwordHash(), 1, input.role().getId())
            : users.registerGoogleUser(input.firstName(), input.lastName(), input.email(), 1, input.role().getId(), input.googleSubject(), input.image(), 1);
        if (count != 1) throw new IllegalStateException("Registration failed");
        UserDTO user = users.getUserByEmail(input.email());
        if (user == null) throw new IllegalStateException("Registration failed");
        if (input.role() == Role.ORGANIZER && users.registerOrganizerData(user.getId(), input.organization(), input.position().trim()) != 1)
            throw new IllegalStateException("Organization assignment failed");
        return user;
    }
}
