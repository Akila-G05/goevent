package com.goevent.repository;

import java.util.List;
import java.util.Optional;

/** Storage contract shared by every entity type. */
public interface Repository<T> {

    List<T> findAll();

    Optional<T> findById(int id);

    /** Inserts a new entity or replaces the stored one with the same id. */
    void save(T item);

    /** Next free id, so callers can build an entity before saving it. */
    int nextId();
}
