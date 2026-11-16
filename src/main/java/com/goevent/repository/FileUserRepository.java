package com.goevent.repository;

import com.goevent.model.Organizer;
import com.goevent.model.User;
import com.goevent.model.Viewer;
import com.goevent.util.CsvUtil;

import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

/** Row layout: role, id, name, email, passwordHash. */
public class FileUserRepository extends CsvRepository<User> implements UserRepository {

    public FileUserRepository(Path file) {
        super(file);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return findAll().stream().filter(user -> user.getEmail().equalsIgnoreCase(email)).findFirst();
    }

    @Override
    protected int idOf(User user) {
        return user.getId();
    }

    @Override
    protected String toLine(User user) {
        return CsvUtil.line(user.role(), String.valueOf(user.getId()), user.getName(),
                user.getEmail(), user.getPasswordHash());
    }

    @Override
    protected User fromLine(String line) {
        List<String> fields = CsvUtil.parse(line);
        int id = Integer.parseInt(fields.get(1));
        return switch (fields.get(0)) {
            case "ORGANIZER" -> new Organizer(id, fields.get(2), fields.get(3), fields.get(4));
            case "VIEWER" -> new Viewer(id, fields.get(2), fields.get(3), fields.get(4));
            default -> throw new IllegalStateException("Unknown role: " + fields.get(0));
        };
    }
}
