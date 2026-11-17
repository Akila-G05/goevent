package com.goevent.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Statement;

@Repository
public class ContactRepo {

    private final JdbcTemplate jdbc;

    public ContactRepo(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long create(String email, String subject, String message) {
        var key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement(
                    "INSERT INTO contact_message(email,subject,body,created_at) VALUES(?,?,?,UTC_TIMESTAMP(6))",
                    Statement.RETURN_GENERATED_KEYS);
            statement.setString(1, email);
            statement.setString(2, subject);
            statement.setString(3, message);
            return statement;
        }, key);
        return key.getKey().longValue();
    }
}
