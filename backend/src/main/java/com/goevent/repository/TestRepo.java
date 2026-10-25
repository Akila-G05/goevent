package com.goevent.repository;

import com.goevent.dto.TestDTO;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

@Repository
public class TestRepo {

    private final JdbcTemplate jdbcTemplate;

    public TestRepo(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<TestDTO> getAllEvents() {

        String sql = "SELECT * FROM test";

        return jdbcTemplate.query(sql, rs -> {

            List<TestDTO> dtolist = new ArrayList<>();

            while (rs.next()) {
                TestDTO dto = new TestDTO();

                dto.setId(rs.getInt("id"));
                dto.setName(rs.getString("name"));

                dtolist.add(dto);
            }

            return dtolist;
        });
    }
}