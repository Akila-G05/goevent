package com.goevent.repository;

import com.goevent.dto.UserDTO;
import com.goevent.util.AppUtil;
import org.slf4j.Logger;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class UserRepo {

    private final JdbcTemplate jdbcTemplate;
    private static final Logger logger = AppUtil.getLogger(UserRepo.class);

    public UserRepo(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // Only profile-safe columns; password, verification code and Google
    // subject are intentionally never loaded here.
    private final RowMapper<UserDTO> userRowMapper = (rs, rowNum) -> {
        UserDTO user = new UserDTO();

        user.setId(rs.getInt("id"));
        user.setFname(rs.getString("fname"));
        user.setLname(rs.getString("lname"));
        user.setEmail(rs.getString("email"));
        user.setRegisteredDate(rs.getTimestamp("registered_date"));
        user.setUserStatusId(rs.getInt("user_status_id"));
        user.setRoleId(rs.getInt("role_id"));
        user.setProfileImgUrl(rs.getString("profile_img_url"));
        user.setAuthTypeId(rs.getInt("auth_type_id"));
        user.setMobile(rs.getString("mobile"));

        return user;
    };

    public UserDTO getUserById(int userId) {

        String query = """
            SELECT id, fname, lname, email, registered_date, user_status_id,
                   role_id, profile_img_url, auth_type_id, mobile
            FROM `user`
            WHERE id = ?
            LIMIT 1
            """;

        try {
            return jdbcTemplate.queryForObject(query, userRowMapper, userId);
        } catch (EmptyResultDataAccessException e) {
            logger.warn("No user found for the current session");
            return null;
        }
    }

    /**
     * Student profile row joined with the university name. Returns null when
     * the account has no student details yet.
     */
    public Map<String, Object> getStudentDetail(int userId) {

        String query = """
            SELECT sd.index_no, sd.uni_email, sd.university_id, u.name AS university_name
            FROM student_detail sd
            INNER JOIN university u ON u.id = sd.university_id
            WHERE sd.user_id = ?
            LIMIT 1
            """;

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(query, userId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    /**
     * Organizer membership row joined with the organization name. Returns null
     * when the account has no organizer details yet.
     */
    public Map<String, Object> getOrganizerDetail(int userId) {

        String query = """
            SELECT uho.organization_id, uho.position, o.name AS organization_name
            FROM user_has_organize uho
            INNER JOIN organization o ON o.id = uho.organization_id
            WHERE uho.user_id = ?
            LIMIT 1
            """;

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(query, userId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public int updateProfile(int userId, String fname, String lname, String mobile, String profileImgUrl) {

        String query = """
            UPDATE `user`
            SET fname = ?, lname = ?, mobile = ?, profile_img_url = ?
            WHERE id = ?
            """;

        return jdbcTemplate.update(query, fname, lname, mobile, profileImgUrl, userId);
    }

    /**
     * Student details may be missing for older accounts, so the write is an
     * upsert rather than a blind UPDATE.
     */
    public void upsertStudentDetail(int userId, String indexNo, String uniEmail, int universityId) {

        if (hasStudentDetail(userId)) {
            String update = """
                UPDATE student_detail
                SET index_no = ?, uni_email = ?, university_id = ?
                WHERE user_id = ?
                """;

            jdbcTemplate.update(update, indexNo, uniEmail, universityId, userId);
            return;
        }

        String insert = """
            INSERT INTO student_detail (index_no, uni_email, user_id, university_id)
            VALUES (?, ?, ?, ?)
            """;

        jdbcTemplate.update(insert, indexNo, uniEmail, userId, universityId);
    }

    /**
     * Organizer membership may be missing for older accounts, so the write is
     * an upsert rather than a blind UPDATE.
     */
    public void upsertOrganizerDetail(int userId, int organizationId, String position) {

        if (hasOrganizerDetail(userId)) {
            String update = """
                UPDATE user_has_organize
                SET organization_id = ?, position = ?
                WHERE user_id = ?
                """;

            jdbcTemplate.update(update, organizationId, position, userId);
            return;
        }

        String insert = """
            INSERT INTO user_has_organize (user_id, registered_date, organization_id, position)
            VALUES (?, NOW(), ?, ?)
            """;

        jdbcTemplate.update(insert, userId, organizationId, position);
    }

    public boolean universityExists(int universityId) {

        String query = "SELECT COUNT(*) FROM university WHERE id = ?";
        Integer count = jdbcTemplate.queryForObject(query, Integer.class, universityId);

        return count != null && count > 0;
    }

    public boolean organizationExists(int organizationId) {

        String query = "SELECT COUNT(*) FROM organization WHERE id = ?";
        Integer count = jdbcTemplate.queryForObject(query, Integer.class, organizationId);

        return count != null && count > 0;
    }

    private boolean hasStudentDetail(int userId) {

        String query = "SELECT COUNT(*) FROM student_detail WHERE user_id = ?";
        Integer count = jdbcTemplate.queryForObject(query, Integer.class, userId);

        return count != null && count > 0;
    }

    private boolean hasOrganizerDetail(int userId) {

        String query = "SELECT COUNT(*) FROM user_has_organize WHERE user_id = ?";
        Integer count = jdbcTemplate.queryForObject(query, Integer.class, userId);

        return count != null && count > 0;
    }
}
