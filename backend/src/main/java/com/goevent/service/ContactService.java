package com.goevent.service;

import com.goevent.dto.ContactRequest;
import com.goevent.repository.ContactRepo;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class ContactService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final ContactRepo contacts;

    public ContactService(ContactRepo contacts) {
        this.contacts = contacts;
    }

    public long submit(ContactRequest input) {
        String email = text(input.email(), 254, "email").toLowerCase(Locale.ROOT);
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid email");
        }
        return contacts.create(email, text(input.subject(), 200, "subject"), text(input.message(), 10000, "message"));
    }

    private static String text(String value, int max, String field) {
        if (value == null || value.isBlank() || value.length() > max) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid " + field);
        }
        return value.trim();
    }
}
