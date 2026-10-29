package com.goevent;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE, properties = {
        "spring.config.import=", "logging.file.name=target/migration-test.log"
})
class FlywayMigrationTest {
    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4")
            .withDatabaseName("goevent_test")
            .withCommand("--character-set-server=utf8mb4", "--collation-server=utf8mb4_unicode_ci");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
    }

    @Autowired Flyway flyway;
    @Autowired JdbcTemplate jdbc;

    @Test
    void startupMigratesFreshDatabaseAndPreservesConstraints() {
        assertEquals(1, jdbc.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE version='1' AND success=1", Integer.class));
        assertEquals(37, jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() "
                        + "AND table_name <> 'flyway_schema_history'", Integer.class));
        assertEquals(5, jdbc.queryForObject("SELECT COUNT(*) FROM role", Integer.class));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM user", Integer.class));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM test", Integer.class));
        assertEquals(0, jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() "
                        + "AND table_collation NOT LIKE 'utf8mb4%'", Integer.class));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () -> jdbc.update(
                "INSERT INTO featured_events (event_id, display_order) VALUES (-1, 1)"));
    }

    @Test
    void repeatStartupDoesNotRepeatSeedsAndCleanIsDisabled() {
        assertEquals(0, flyway.migrate().migrationsExecuted);
        assertEquals(5, jdbc.queryForObject("SELECT COUNT(*) FROM role", Integer.class));
        assertTrue(flyway.validateWithResult().validationSuccessful);
        assertThrows(FlywayException.class, flyway::clean);
    }

    @Test
    void changedAppliedMigrationFailsValidation(@TempDir Path directory) throws Exception {
        try (var stream = getClass().getResourceAsStream("/db/migration/V1__initial_schema.sql")) {
            assertNotNull(stream);
            Files.write(directory.resolve("V1__initial_schema.sql"), stream.readAllBytes());
        }
        Files.writeString(directory.resolve("V1__initial_schema.sql"), "\n-- changed checksum\n",
                java.nio.file.StandardOpenOption.APPEND);
        var modified = Flyway.configure().dataSource(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword())
                .locations("filesystem:" + directory).load();
        assertFalse(modified.validateWithResult().validationSuccessful);
        assertThrows(FlywayException.class, modified::migrate);
    }

    @Test
    void pendingVersionAppliesOnceAndSupportsFourByteUnicode(@TempDir Path directory) throws Exception {
        var url = newDatabase();
        migrations(url).migrate();
        try (var stream = getClass().getResourceAsStream("/db/migration/V1__initial_schema.sql")) {
            assertNotNull(stream);
            Files.write(directory.resolve("V1__initial_schema.sql"), stream.readAllBytes());
        }
        Files.writeString(directory.resolve("V2__add_marker.sql"),
                "ALTER TABLE test ADD COLUMN migration_marker INT NULL;\n");
        var upgrade = Flyway.configure().dataSource(url, "root", MYSQL.getPassword())
                .locations("filesystem:" + directory).load();
        assertEquals(1, upgrade.migrate().migrationsExecuted);
        assertEquals(0, upgrade.migrate().migrationsExecuted);
        var database = new JdbcTemplate(new org.springframework.jdbc.datasource.DriverManagerDataSource(
                url, "root", MYSQL.getPassword()));
        database.update("INSERT INTO test (name, migration_marker) VALUES (?, ?)", "Ticket 🎟", 42);
        assertEquals("Ticket 🎟", database.queryForObject(
                "SELECT name FROM test WHERE migration_marker=42", String.class));
    }

    @Test
    void untrackedNonEmptyDatabaseRequiresExplicitBaseline() throws Exception {
        var url = newDatabase();
        var database = new JdbcTemplate(new org.springframework.jdbc.datasource.DriverManagerDataSource(
                url, "root", MYSQL.getPassword()));
        database.execute("CREATE TABLE existing_data (id INT PRIMARY KEY)");
        database.update("INSERT INTO existing_data VALUES (42)");
        var untracked = migrations(url);
        assertThrows(FlywayException.class, untracked::migrate);
        assertEquals(42, database.queryForObject("SELECT id FROM existing_data", Integer.class));
        assertEquals(0, database.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables "
                        + "WHERE table_schema=DATABASE() AND table_name='flyway_schema_history'", Integer.class));
    }

    @Test
    void reviewedExistingSchemaCanBeExplicitlyBaselinedWithoutReplayingSeeds() throws Exception {
        var url = newDatabase();
        var existing = migrations(url);
        existing.migrate();
        var database = new JdbcTemplate(new org.springframework.jdbc.datasource.DriverManagerDataSource(
                url, "root", MYSQL.getPassword()));
        // Simulate a pre-Flyway installation in this isolated test database only.
        database.execute("DROP TABLE flyway_schema_history");
        assertThrows(FlywayException.class, existing::migrate);
        existing.baseline();
        assertEquals(0, existing.migrate().migrationsExecuted);
        assertEquals(5, database.queryForObject("SELECT COUNT(*) FROM role", Integer.class));
        assertEquals("BASELINE", database.queryForObject(
                "SELECT type FROM flyway_schema_history WHERE version='1'", String.class));
    }

    @Test
    void failedMysqlDdlIsRecordedAndRequiresExplicitRecovery(@TempDir Path directory) throws Exception {
        var url = newDatabase();
        Files.writeString(directory.resolve("V1__broken.sql"),
                "CREATE TABLE partial_change (id INT);\nTHIS IS INVALID SQL;\n");
        var broken = Flyway.configure().dataSource(url, "root", MYSQL.getPassword())
                .locations("filesystem:" + directory).load();
        assertThrows(FlywayException.class, broken::migrate);
        var database = new JdbcTemplate(new org.springframework.jdbc.datasource.DriverManagerDataSource(
                url, "root", MYSQL.getPassword()));
        assertEquals(0, database.queryForObject(
                "SELECT success FROM flyway_schema_history WHERE version='1'", Integer.class));
        assertThrows(FlywayException.class, broken::migrate);
        // MySQL DDL is not rolled back: undo the partial DDL before repairing history.
        database.execute("DROP TABLE partial_change");
        Files.writeString(directory.resolve("V1__broken.sql"), "CREATE TABLE partial_change (id INT);\n");
        broken.repair();
        assertEquals(1, broken.migrate().migrationsExecuted);
    }

    private static Flyway migrations(String url) {
        return Flyway.configure().dataSource(url, "root", MYSQL.getPassword())
                .locations("classpath:db/migration").baselineOnMigrate(false).baselineVersion("1").load();
    }

    private static String newDatabase() throws Exception {
        var name = "migration_" + UUID.randomUUID().toString().replace("-", "");
        try (var connection = DriverManager.getConnection(MYSQL.getJdbcUrl(), "root", MYSQL.getPassword());
             var statement = connection.createStatement()) {
            statement.execute("CREATE DATABASE `" + name + "` CHARACTER SET utf8mb4");
        }
        return MYSQL.getJdbcUrl().replace("/" + MYSQL.getDatabaseName(), "/" + name);
    }
}
