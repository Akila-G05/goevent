package com.goevent.service;

import com.goevent.repository.AuthenticationRepo;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;

@Service
public class AdminAuthenticationService {
    private final AuthenticationRepo users;
    private final PasswordEncoder passwords;
    private final AdminLoginThrottle throttle;
    private final String dummyHash;
    public AdminAuthenticationService(AuthenticationRepo users, PasswordEncoder passwords, AdminLoginThrottle throttle) {
        this.users = users; this.passwords = passwords; this.throttle = throttle;
        this.dummyHash = passwords.encode(java.util.UUID.randomUUID().toString());
    }
    public Map<String, Object> login(String email, String password, HttpServletRequest request) {
        if (email == null || email.isBlank() || email.length() > 100 || password == null || password.isEmpty()
                || password.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid credentials");
        email = email.trim().toLowerCase(Locale.ROOT);
        throttle.check(email, request.getRemoteAddr());
        var user = users.getUserByEmail(email);
        String hash = user != null && user.getPassword() != null ? user.getPassword() : dummyHash;
        boolean matches = passwords.matches(password, hash);
        if (!matches || user == null || user.getRoleId() != 3 || user.getUserStatusId() != 1
                || user.getPassword() == null)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        var old = request.getSession(false);
        if (old != null) old.invalidate();
        request.getSession(true).setAttribute("adminUserId", user.getId());
        return Map.of("status", true, "userId", user.getId(), "role", "ADMIN");
    }
    public Map<String, Object> session(HttpServletRequest request) {
        var session=request.getSession(false);
        Object identity=session==null?null:session.getAttribute("adminUserId");
        if(!(identity instanceof Integer id)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Admin session required");
        var user=users.getUserById(id);
        if(user==null||user.getRoleId()!=3||user.getUserStatusId()!=1)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Active admin required");
        String name=((user.getFname()==null?"":user.getFname())+" "+(user.getLname()==null?"":user.getLname())).trim();
        return Map.of("status",true,"userId",id,"role","ADMIN","name",name.isEmpty()?user.getEmail():name,"email",user.getEmail());
    }
    public Map<String, Object> switchMode(HttpServletRequest request, boolean toAdmin) {
        var previous=request.getSession(false);
        Object identity=previous==null?null:previous.getAttribute(toAdmin?"userId":"adminUserId");
        if (!(identity instanceof Integer id) || (toAdmin && !identity.equals(previous.getAttribute("adminUserModeId"))))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Admin mode switch required");
        var user=users.getUserById(id);
        if(user==null || user.getRoleId()!=3 || user.getUserStatusId()!=1)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Active admin required");
        previous.invalidate();
        var session=request.getSession(true);
        if(toAdmin) {
            session.setAttribute("adminUserId",id);
        } else {
            String name=((user.getFname()==null?"":user.getFname())+" "+(user.getLname()==null?"":user.getLname())).trim();
            session.setAttribute("userId",id);
            session.setAttribute("name",name.isEmpty()?user.getEmail():name);
            session.setAttribute("email",user.getEmail());
            session.setAttribute("role","ADMIN");
            session.setAttribute("adminUserModeId",id);
        }
        return Map.of("status",true,"userId",id,"role","ADMIN","adminUserMode",!toAdmin);
    }
}
