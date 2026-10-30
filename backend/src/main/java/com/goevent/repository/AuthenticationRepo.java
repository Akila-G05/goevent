package com.goevent.repository;

import com.goevent.dto.UserDTO;
import com.goevent.service.AuthenticationService;
import com.goevent.util.AppUtil;
import org.slf4j.Logger;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.sql.Timestamp;
import java.time.LocalDateTime;

import java.util.Map;

@Repository
public class AuthenticationRepo {

    private final JdbcTemplate jdbcTemplate;
    private static final Logger logger = AppUtil.getLogger(AuthenticationRepo.class);

    public AuthenticationRepo(JdbcTemplate jdbcTemplate){
        this.jdbcTemplate = jdbcTemplate;
    }

    // Map database row to UserDTO
    private final RowMapper<UserDTO> userRowMapper = (rs, rowNum) -> {
        UserDTO user = new UserDTO();

        user.setId(rs.getInt("id"));
        user.setFname(rs.getString("fname"));
        user.setLname(rs.getString("lname"));
        user.setEmail(rs.getString("email"));
        user.setRegisteredDate(rs.getTimestamp("registered_date"));
        user.setVCode(rs.getString("v_code"));
        user.setUserStatusId(rs.getInt("user_status_id"));
        user.setRoleId(rs.getInt("role_id"));
        user.setGoogleSub(rs.getString("google_sub"));
        user.setProfileImgUrl(rs.getString("profile_img_url"));
        user.setPassword(rs.getString("password"));
        user.setAuthTypeId(rs.getInt("auth_type_id"));

        return user;
    };

    // Get existing Google user
    public UserDTO getUserByGoogleSub(String googleSub) {

        String query = "SELECT * FROM `user` WHERE google_sub = ? LIMIT 1";

        try {
            return jdbcTemplate.queryForObject(query, userRowMapper, googleSub);
        } catch (EmptyResultDataAccessException e) {
            return null;
        }
    }

    // Check whether email already exists
    public UserDTO getUserByEmail(String email) {

        String query = "SELECT * FROM `user` WHERE email = ? LIMIT 1";

        try {
            return jdbcTemplate.queryForObject(query, userRowMapper, email);
        } catch (EmptyResultDataAccessException e) {
            return null;
        }
    }

    // Register new Google user
    public int registerGoogleUser(String fname, String lname,String email,int userStatusId,int roleId,String googleSub,String profileImgUrl,int authTypeId) {

        String query = """
                INSERT INTO `user` (fname, lname, email, registered_date, v_code, user_status_id, role_id, google_sub, profile_img_url, password, auth_type_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;

        return jdbcTemplate.update(
                query,
                fname, lname, email, Timestamp.valueOf(LocalDateTime.now()), null, userStatusId, roleId, googleSub, profileImgUrl, null, authTypeId
        );
    }

}
