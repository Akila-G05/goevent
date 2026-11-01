package com.goevent.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class ContentRepo {

    private final JdbcTemplate jdbcTemplate;

    public ContentRepo(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // Get all roles
    public List<Map<String, Object>> getRoles() {

        String query = "SELECT id, type FROM role ORDER BY id";

        return jdbcTemplate.queryForList(query);
    }

    // Get all event categories
    public List<Map<String, Object>> getCategories() {

        String query = "SELECT id, name FROM category ORDER BY id";

        return jdbcTemplate.queryForList(query);
    }

    // Get all event statuses
    public List<Map<String, Object>> getEventStatuses() {

        String query = "SELECT id, name FROM status ORDER BY id";

        return jdbcTemplate.queryForList(query);
    }

    // Get all organization types
    public List<Map<String, Object>> getOrganizationTypes() {

        String query = "SELECT id, type FROM org_type ORDER BY id";

        return jdbcTemplate.queryForList(query);
    }

    // Get all universities
    public List<Map<String, Object>> getUniversities() {

        String query = "SELECT id, name FROM university ORDER BY name";

        return jdbcTemplate.queryForList(query);
    }

    // Get all organizations with their types
    public List<Map<String, Object>> getOrganizations() {

//        String query = """
//                SELECT o.id,o.name,o.org_type_id AS orgTypeId,ot.type AS orgTypeFROM organization o
//                INNER JOIN org_type ot ON o.org_type_id = ot.id ORDER BY o.name
//                """;

        String query = """
                SELECT org.id, org.name, org.org_type_id, ot.type FROM organization org 
                INNER JOIN org_type ot ON ot.id = org.org_type_id ORDER BY org.name
                """;

        return jdbcTemplate.queryForList(query);
    }
}