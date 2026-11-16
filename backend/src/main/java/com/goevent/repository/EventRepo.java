package com.goevent.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Every SQL statement used by the event module.
 *
 * <p>An event is written across several tables ({@code venue}, {@code link},
 * {@code event}, {@code event_has_links}, {@code event_dates},
 * {@code event_has_tags}); the service owns the transaction and this class only
 * performs the statements.</p>
 */
@Repository
public class EventRepo {

    /** Role and status of the signed-in account, used for authorisation. */
    private static final String ACCOUNT_ROW =
            "SELECT role_id, user_status_id FROM `user` WHERE id=?";

    private final JdbcTemplate jdbc;

    public EventRepo(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // --- lookups ---------------------------------------------------------

    public Map<String, Object> account(int userId) {
        List<Map<String, Object>> rows =
                jdbc.queryForList(ACCOUNT_ROW, userId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public Optional<Integer> categoryId(String name) {
        return firstInt(
                "SELECT id FROM category WHERE UPPER(name)=? ORDER BY id LIMIT 1",
                name.trim().toUpperCase(Locale.ROOT));
    }

    public boolean categoryExists(int id) {
        return count("SELECT COUNT(*) FROM category WHERE id=?", id) == 1;
    }

    public Optional<Integer> audienceId(String name) {
        return firstInt(
                "SELECT id FROM audience WHERE UPPER(type)=? ORDER BY id LIMIT 1",
                name.trim().toUpperCase(Locale.ROOT));
    }

    public boolean audienceExists(int id) {
        return count("SELECT COUNT(*) FROM audience WHERE id=?", id) == 1;
    }

    public Optional<Integer> tagId(String name) {
        return firstInt(
                "SELECT id FROM tags WHERE UPPER(name)=? ORDER BY id LIMIT 1",
                name.trim().toUpperCase(Locale.ROOT));
    }

    // --- writes ----------------------------------------------------------

    public long insertVenue(String name, String address, String city, String link) {
        return insert(
                "INSERT INTO venue(name,address,city,link) VALUES(?,?,?,?)",
                name, address, city, link);
    }

    public long insertLink(String name, String url) {
        return insert(
                "INSERT INTO link(link_name,link) VALUES(?,?)",
                name, url);
    }

    public long insertEvent(String name, String description, int categoryId, long venueId, int statusId, int audienceId, int levelId, Long linkId, int publishedBy, LocalDateTime startsAt, LocalDateTime endsAt) {
        // `link_id` is the legacy single-link column: it keeps the first link so
        // older readers still resolve something. Every link, including the first,
        // is also written to `event_has_links` by `linkEvent`.
        return insert(
                "INSERT INTO `event`(name,description,category_id,venue_id,event_status_id,"
                        + "audience_id,event_level_id,img_id,link_id,published_by,aproved_by,"
                        + "starts_at,ends_at) VALUES(?,?,?,?,?,?,?,NULL,?,?,NULL,?,?)",
                name, description, categoryId, venueId, statusId,
                audienceId, levelId, linkId, publishedBy, startsAt, endsAt);
    }

    public void linkEvent(long eventId, long linkId) {
        jdbc.update(
                "INSERT INTO event_has_links(event_id,link_id) VALUES(?,?)",
                eventId, linkId);
    }

    public void insertEventDate(long eventId, LocalDate date, String timeRange) {
        jdbc.update(
                "INSERT INTO event_dates(`date`,`time`,event_id) VALUES(?,?,?)",
                Date.valueOf(date), timeRange, eventId);
    }

    public void attachTag(long eventId, int tagId) {
        jdbc.update(
                "INSERT INTO event_has_tags(event_id,tags_id) VALUES(?,?)",
                eventId, tagId);
    }

    // --- public listing --------------------------------------------------

    /**
     * Approved events that still have an upcoming date, ordered by their first
     * upcoming date. Each row carries the earliest upcoming date and time only.
     */
    public List<Map<String, Object>> approvedEvents(int statusId, int limit) {
        return jdbc.queryForList(
                """
                SELECT e.id, e.name, e.description, c.name AS category,
                       a.type AS audience, l.name AS event_level,
                       v.name AS venue_name, v.city AS venue_city,
                       i.path AS image_path,
                       next_date.date AS starts_on, next_date.time AS time_range
                FROM `event` e
                JOIN category c ON c.id = e.category_id
                JOIN audience a ON a.id = e.audience_id
                JOIN event_level l ON l.id = e.event_level_id
                JOIN venue v ON v.id = e.venue_id
                LEFT JOIN img i ON i.id = e.img_id
                JOIN event_dates next_date ON next_date.id = (
                    SELECT ed.id FROM event_dates ed
                    WHERE ed.event_id = e.id AND ed.date >= CURDATE()
                    ORDER BY ed.date, ed.id LIMIT 1)
                WHERE e.event_status_id = ?
                ORDER BY next_date.date, e.id
                LIMIT ?
                """,
                statusId, limit);
    }

    // --- public detail --------------------------------------------------

    /** One event with its category, audience, level, venue and cover image; null when not found. */
    public Map<String, Object> approvedEventRow(long eventId, int statusId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                """
                SELECT e.id, e.name, e.description, c.name AS category,
                       a.type AS audience, l.name AS event_level,
                       v.name AS venue_name, v.address AS venue_address,
                       v.city AS venue_city, v.link AS venue_link,
                       i.path AS image_path, i.bannerpath AS banner_path,
                       CONCAT(u.fname, ' ', u.lname) AS organizer_name,
                       YEAR(u.registered_date) AS organizer_since
                FROM `event` e
                JOIN category c ON c.id = e.category_id
                JOIN audience a ON a.id = e.audience_id
                JOIN event_level l ON l.id = e.event_level_id
                JOIN venue v ON v.id = e.venue_id
                JOIN `user` u ON u.id = e.published_by
                LEFT JOIN img i ON i.id = e.img_id
                WHERE e.id = ? AND e.event_status_id = ?
                """,
                eventId, statusId);

        return rows.isEmpty() ? null : rows.get(0);
    }

    public List<Map<String, Object>> eventDateRows(long eventId) {
        return jdbc.queryForList(
                "SELECT `date`, `time` FROM event_dates WHERE event_id=? ORDER BY `date`, id",
                eventId);
    }

    public List<Map<String, Object>> eventLinkRows(long eventId) {
        return jdbc.queryForList(
                "SELECT k.link_name, k.link FROM event_has_links ehl "
                        + "JOIN link k ON k.id = ehl.link_id WHERE ehl.event_id=? ORDER BY ehl.link_id",
                eventId);
    }

    public List<String> eventTagNames(long eventId) {
        return jdbc.queryForList(
                "SELECT t.name FROM event_has_tags eht JOIN tags t ON t.id = eht.tags_id "
                        + "WHERE eht.event_id=? ORDER BY t.name",
                String.class, eventId);
    }

    // --- images ----------------------------------------------------------

    /**
     * Owner and current {@code img_id} of an event, used to authorise an upload
     * and to replace a previous image instead of leaking orphan rows.
     */
    public Map<String, Object> eventImageRow(long eventId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT published_by, img_id FROM `event` WHERE id=?", eventId);

        return rows.isEmpty() ? null : rows.get(0);
    }

    public long insertImage(String path, String bannerPath) {
        return insert("INSERT INTO img(path,bannerpath) VALUES(?,?)", path, bannerPath);
    }

    public void updateImage(long imageId, String path, String bannerPath) {
        jdbc.update("UPDATE img SET path=?, bannerpath=? WHERE id=?",
                path, bannerPath, imageId);
    }

    public void setEventImage(long eventId, long imageId) {
        jdbc.update("UPDATE `event` SET img_id=? WHERE id=?", imageId, eventId);
    }

    // --- helpers ---------------------------------------------------------

    private Optional<Integer> firstInt(String sql, Object... args) {
        List<Integer> values = jdbc.queryForList(sql, Integer.class, args);
        return values.stream().findFirst();
    }

    private long count(String sql, Object... args) {
        Long value = jdbc.queryForObject(sql, Long.class, args);
        return value == null ? 0L : value;
    }

    private long insert(String sql, Object... args) {

        KeyHolder keys = new GeneratedKeyHolder();

        jdbc.update(connection -> {
            PreparedStatement statement =
                    connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);

            for (int index = 0; index < args.length; index++) {
                statement.setObject(index + 1, args[index]);
            }

            return statement;
        }, keys);

        Number key = keys.getKey();

        if (key == null) {
            throw new IllegalStateException("The database did not return a generated key");
        }

        return key.longValue();
    }
}
