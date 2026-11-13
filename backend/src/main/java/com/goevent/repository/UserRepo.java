package com.goevent.repository;

import com.goevent.dto.UserDTO;
import com.goevent.util.AppUtil;
import org.slf4j.Logger;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepo {

    private final JdbcTemplate jdbcTemplate;
    private static final Logger logger = AppUtil.getLogger(UserRepo.class);

    public UserRepo(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

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
            SELECT id, fname, lname, email, registered_date, user_status_id,role_id, profile_img_url, auth_type_id, mobile
            FROM `user` WHERE id = ? LIMIT 1
            """;

        try {
            return jdbcTemplate.queryForObject(query, userRowMapper, userId);
        } catch (EmptyResultDataAccessException e) {
            logger.warn("No user found for the current session");
            return null;
        }
    }
}
