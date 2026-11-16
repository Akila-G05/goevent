package com.goevent.repository;

import com.goevent.exception.GoEventException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import static java.nio.charset.StandardCharsets.UTF_8;

/**
 * File-backed repository that stores one entity per line. Subclasses only describe
 * how one entity converts to and from a line; reading, writing and id handling live here.
 */
public abstract class CsvRepository<T> implements Repository<T> {

    private final Path file;

    protected CsvRepository(Path file) {
        this.file = file;
    }

    @Override
    public synchronized List<T> findAll() {
        if (!Files.exists(file)) {
            return List.of();
        }
        try {
            return Files.readAllLines(file, UTF_8).stream()
                    .filter(line -> !line.isBlank())
                    .map(this::parseLine)
                    .toList();
        } catch (IOException e) {
            throw new GoEventException("Could not read " + file.getFileName() + ".", e);
        }
    }

    @Override
    public Optional<T> findById(int id) {
        return findAll().stream().filter(item -> idOf(item) == id).findFirst();
    }

    @Override
    public synchronized int nextId() {
        return findAll().stream().mapToInt(this::idOf).max().orElse(0) + 1;
    }

    @Override
    public synchronized void save(T item) {
        List<T> items = new ArrayList<>(findAll());
        items.removeIf(existing -> idOf(existing) == idOf(item));
        items.add(item);
        items.sort(Comparator.comparingInt(this::idOf));
        write(items);
    }

    private void write(List<T> items) {
        List<String> lines = items.stream().map(this::toLine).toList();
        try {
            Files.createDirectories(file.toAbsolutePath().getParent());
            Files.write(file, lines, UTF_8);
        } catch (IOException e) {
            throw new GoEventException("Could not write " + file.getFileName() + ".", e);
        }
    }

    private T parseLine(String line) {
        try {
            return fromLine(line);
        } catch (RuntimeException e) {
            throw new GoEventException("Corrupt record in " + file.getFileName() + ".", e);
        }
    }

    protected abstract int idOf(T item);

    protected abstract String toLine(T item);

    protected abstract T fromLine(String line);
}
