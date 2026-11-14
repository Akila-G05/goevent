package com.goevent.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminAccessRepository {
    private final JdbcTemplate jdbc;
    public AdminAccessRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public boolean isActiveAdmin(int id) {
        return Integer.valueOf(1).equals(jdbc.queryForObject(
            "SELECT COUNT(*) FROM `user` WHERE id=? AND role_id=3 AND user_status_id=1",
            Integer.class, id));
    }
    public boolean isActiveUser(int id) {
        return Integer.valueOf(1).equals(jdbc.queryForObject(
            "SELECT COUNT(*) FROM `user` WHERE id=? AND user_status_id=1", Integer.class,id));
    }
}
