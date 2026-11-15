package com.goevent.repository;

import org.springframework.jdbc.core.JdbcTemplate;

public class EventRepo {

    private final JdbcTemplate jdbcTemplate;

    public EventRepo(JdbcTemplate jdbcTemplate){
        this.jdbcTemplate = jdbcTemplate;
    }
}
