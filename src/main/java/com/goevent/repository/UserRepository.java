package com.goevent.repository;

import com.goevent.model.User;

import java.util.Optional;

public interface UserRepository extends Repository<User> {

    Optional<User> findByEmail(String email);
}
