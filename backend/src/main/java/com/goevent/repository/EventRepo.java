package com.goevent.repository;

import com.goevent.dto.EventFilterDTO;
import com.goevent.enums.EventSort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

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

    private static final String SUMMARY_SELECT = """
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
            """;

    /** Approved events that still have an upcoming date, in the requested order. */
    public List<Map<String, Object>> approvedEvents(int statusId, EventSort sort, int limit) {
        return jdbc.queryForList(
                SUMMARY_SELECT + " WHERE e.event_status_id = ? " + orderBy(sort) + " LIMIT ?",
                statusId, limit);
    }

    /**
     * Approved upcoming events published by a student of the given university,
     * earliest first.
     */
    public List<Map<String, Object>> approvedEventsForUniversity(int statusId, int universityId, int limit) {
        return jdbc.queryForList(
                SUMMARY_SELECT
                        + " WHERE e.event_status_id = ?"
                        + " AND EXISTS (SELECT 1 FROM student_detail sd"
                        + " WHERE sd.user_id = e.published_by AND sd.university_id = ?)"
                        + " ORDER BY e.created_at DESC, e.id DESC LIMIT ?",
                statusId, universityId, limit);
    }

    /** Every upcoming date of an approved event, earliest first, for the organizer calendar. */
    public List<LocalDate> approvedEventDates(int statusId) {
        return jdbc.query(
                "SELECT DISTINCT ed.date FROM event_dates ed"
                        + " JOIN `event` e ON e.id = ed.event_id"
                        + " WHERE e.event_status_id = ? AND ed.date >= CURDATE()"
                        + " ORDER BY ed.date",
                (rs, rowNum) -> rs.getDate(1).toLocalDate(),
                statusId);
    }
    /** Approved upcoming events the user has saved, earliest first. */
    public List<Map<String, Object>> approvedSavedBy(int userId, int statusId) {
        return jdbc.queryForList(
                SUMMARY_SELECT
                        + " JOIN saved_event se ON se.event_id = e.id AND se.user_id = ?"
                        + " WHERE e.event_status_id = ?"
                        + " ORDER BY next_date.date, e.id",
                userId, statusId);
    }

    /** Stores the save; saving twice is harmless because the pair is the primary key. */
    public void saveEvent(int userId, long eventId) {
        jdbc.update("INSERT IGNORE INTO saved_event(user_id, event_id) VALUES(?,?)", userId, eventId);
    }

    public void unsaveEvent(int userId, long eventId) {
        jdbc.update("DELETE FROM saved_event WHERE user_id=? AND event_id=?", userId, eventId);
    }
    /** University of a student account, when one is recorded. */
    public Optional<Integer> studentUniversityId(int userId) {
        return jdbc.queryForList(
                "SELECT university_id FROM student_detail WHERE user_id=? ORDER BY id LIMIT 1",
                Integer.class, userId).stream().findFirst();
    }

    /**
     * Approved upcoming events matching the filter. Text is bound as parameters
     * (LIKE wildcards escaped); the sort comes from a fixed set of SQL fragments.
     */
    public List<Map<String, Object>> searchApproved(int statusId, EventFilterDTO filter, EventSort sort, int limit) {
        StringBuilder sql = new StringBuilder(SUMMARY_SELECT).append(" WHERE e.event_status_id = ?");
        List<Object> args = new ArrayList<>();
        args.add(statusId);

        if (filter.getQuery() != null) {
            String like = "%" + escapeLike(filter.getQuery()) + "%";
            sql.append(" AND (e.name LIKE ? ESCAPE '\\\\' OR e.description LIKE ? ESCAPE '\\\\'"
                    + " OR v.name LIKE ? ESCAPE '\\\\' OR v.city LIKE ? ESCAPE '\\\\' OR c.name LIKE ? ESCAPE '\\\\')");

            for (int i = 0; i < 5; i++) {
                args.add(like);
            }
        }

        if (filter.getCategory() != null) {
            sql.append(" AND c.name = ?");
            args.add(filter.getCategory());
        }

        if (filter.getAudience() != null) {
            sql.append(" AND a.type = ?");
            args.add(filter.getAudience());
        }

        if (!filter.getTags().isEmpty()) {
            String marks = String.join(",", Collections.nCopies(filter.getTags().size(), "?"));
            sql.append(" AND EXISTS (SELECT 1 FROM event_has_tags eht JOIN tags t ON t.id = eht.tags_id"
                    + " WHERE eht.event_id = e.id AND t.name IN (" + marks + "))");
            args.addAll(filter.getTags());
        }

        sql.append(' ').append(orderBy(sort)).append(" LIMIT ?");
        args.add(limit);

        return jdbc.queryForList(sql.toString(), args.toArray());
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    /** Category names for the events-page filter. */
    public List<String> categoryNames() {
        return jdbc.queryForList("SELECT name FROM category ORDER BY name", String.class);
    }

    /** Audience names for the events-page filter. */
    public List<String> audienceNames() {
        return jdbc.queryForList("SELECT type FROM audience ORDER BY id", String.class);
    }

    /** Distinct tag names for the events-page filter. */
    public List<String> tagNames() {
        return jdbc.queryForList(
                "SELECT DISTINCT name FROM tags WHERE name IS NOT NULL ORDER BY name", String.class);
    }
    /** Fixed SQL per sort value; the enum is never concatenated from user input. */
    private static String orderBy(EventSort sort) {
        return switch (sort) {
            case ASC -> "ORDER BY next_date.date, e.id";
            case DESC -> "ORDER BY next_date.date DESC, e.id DESC";
            case RANDOM -> "ORDER BY RAND()";
            case NAME -> "ORDER BY e.name, e.id";
            case CREATED -> "ORDER BY e.created_at DESC, e.id DESC";
        };
    }
    // --- public detail --------------------------------------------------

    /** SQL for one event's full detail row; callers add the status condition they need. */
    private static final String DETAIL_ROW_SQL = """
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
            WHERE e.id = ?
            """;

    /** One approved event with its category, audience, level, venue and cover image; null when not found. */
    public Map<String, Object> approvedEventRow(long eventId, int statusId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                DETAIL_ROW_SQL + " AND e.event_status_id = ?", eventId, statusId);

        return rows.isEmpty() ? null : rows.get(0);
    }

    /** Any event's detail row regardless of review status, for its owner. */
    public Map<String, Object> eventRowById(long eventId) {
        List<Map<String, Object>> rows = jdbc.queryForList(DETAIL_ROW_SQL, eventId);

        return rows.isEmpty() ? null : rows.get(0);
    }

    /** Every event the user published, in any review state, latest first. */
    public List<Map<String, Object>> ownedEventRows(int userId) {
        return jdbc.queryForList(
                """
                SELECT e.id, e.name, c.name AS category, a.type AS audience,
                       l.name AS event_level, s.name AS status,
                       v.name AS venue_name, v.city AS venue_city,
                       i.path AS image_path,
                       first_date.date AS starts_on, first_date.time AS time_range
                FROM `event` e
                JOIN category c ON c.id = e.category_id
                JOIN audience a ON a.id = e.audience_id
                JOIN event_level l ON l.id = e.event_level_id
                JOIN status s ON s.id = e.event_status_id
                JOIN venue v ON v.id = e.venue_id
                LEFT JOIN img i ON i.id = e.img_id
                LEFT JOIN event_dates first_date ON first_date.id = (
                    SELECT ed.id FROM event_dates ed
                    WHERE ed.event_id = e.id
                    ORDER BY ed.date, ed.id LIMIT 1)
                WHERE e.published_by = ?
                ORDER BY e.created_at DESC, e.id DESC
                """,
                userId);
    }

    /** Venue and cover-image ownership fields needed before an update. */
    public Map<String, Object> eventOwnerRow(long eventId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT published_by, venue_id, img_id FROM `event` WHERE id=?", eventId);

        return rows.isEmpty() ? null : rows.get(0);
    }

    public void updateEvent(long eventId, String name, String description, int categoryId,
                            int audienceId, LocalDateTime startsAt, LocalDateTime endsAt, Long linkId) {
        jdbc.update(
                "UPDATE `event` SET name=?, description=?, category_id=?, audience_id=?,"
                        + " starts_at=?, ends_at=?, link_id=? WHERE id=?",
                name, description, categoryId, audienceId, startsAt, endsAt, linkId, eventId);
    }

    public void updateVenue(long venueId, String name, String address, String city, String link) {
        jdbc.update(
                "UPDATE venue SET name=?, address=?, city=?, link=? WHERE id=?",
                name, address, city, link, venueId);
    }

    public List<Long> eventLinkIds(long eventId) {
        return jdbc.queryForList(
                "SELECT link_id FROM event_has_links WHERE event_id=?", Long.class, eventId);
    }

    /** Removes the event's link associations; the link rows themselves are removed separately. */
    public void clearEventLinks(long eventId) {
        jdbc.update("DELETE FROM event_has_links WHERE event_id=?", eventId);
    }

    /** Deletes a link row only when no event still uses it. */
    public void deleteLinkIfUnused(long linkId) {
        jdbc.update(
                "DELETE FROM link WHERE id=? AND id NOT IN (SELECT link_id FROM event_has_links)",
                linkId);
    }

    public void clearEventDates(long eventId) {
        jdbc.update("DELETE FROM event_dates WHERE event_id=?", eventId);
    }

    public void clearEventTags(long eventId) {
        jdbc.update("DELETE FROM event_has_tags WHERE event_id=?", eventId);
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
