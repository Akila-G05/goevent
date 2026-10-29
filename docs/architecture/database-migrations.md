# Database migrations

The backend uses Spring Boot's Flyway auto-configuration with `flyway-core` and
`flyway-mysql`. Versions are managed by the Spring Boot 3.5.7 parent. Flyway runs
before application database access and uses the configured datasource by default.
Docker Compose creates the database and application user only; it no longer runs
`init.sql`. Spring's basic SQL initializer is disabled.

## Fresh local database

1. Configure `.env` using `.env.example` and start `docker compose up -d --wait mysql`.
2. From `backend/`, run `mvn spring-boot:run` (use a clean build if old generated
   configuration remains in `target/`).
3. Flyway applies `V1__initial_schema.sql` and records the version and checksum in
   `flyway_schema_history`. Subsequent startups validate checksums and only apply
   pending versions. Starting MySQL alone does not create application tables.

V1 retains the legacy dump's 37 tables, columns, constraints and reference IDs.
Fresh tables use InnoDB and `utf8mb4`. It excludes the legacy personal user seed
and demo `test` rows; a fresh test endpoint returns an empty events list. It keeps
legacy money column types and domain schema issues unchanged; fixes require new,
reviewed migrations. Foreign key checks are disabled during the legacy forward
references and restored at the end; the retained reference rows have no dangling
references. Do not add personal data to migrations.

## Existing databases without Flyway history

The backend intentionally refuses to migrate non-empty databases without history.
`baseline-on-migrate` is false; do not turn it on to work around a startup error.
Baselining records a version; it does **not** compare schema structure or fix drift.

Before any shared or production adoption:

1. Verify the exact host, schema and credentials. Take an authorized backup and
   verify that it can be restored to an isolated database.
2. Compare the restored schema and required reference data to V1. Check all 37
   table definitions, foreign keys, indexes and reference IDs, not just table counts.
   The old dump used `utf8mb3` and contained personal/demo seeds: V1 uses `utf8mb4`
   for fresh installs and omits those seeds. Baselining preserves existing data
   and character sets; it does not perform a character-set conversion or remove
   old rows. Document and explicitly accept these differences or plan a separate
   forward migration, accounting for index lengths, locks and data volume.
3. Reconcile any other schema differences before marking the schema as version 1.
4. Using a compatible, separately installed Flyway CLI, configure `FLYWAY_URL`,
   `FLYWAY_USER`, and `FLYWAY_PASSWORD` for the verified target using secret-safe
   environment configuration. The CLI does not import the application's `.env`.
   Then explicitly record the reviewed baseline:

   ```bash
   flyway -baselineVersion=1 baseline
   ```

5. Start the backend with automatic baselining still disabled. V1 is skipped for
   this baselined database; subsequent versioned migrations run normally. Check
   history and affected queries in the restored copy before an authorized rollout.

No existing local, shared or production database was baselined as part of this
implementation. Existing Compose credentials must match its persisted users;
changing `.env` cannot change users already stored in the volume.

## Adding migrations and operating safely

Add `V2__description.sql`, `V3__description.sql`, etc. in
`backend/src/main/resources/db/migration/`. Never change applied migrations:
checksum validation is enabled, as is migration filename validation. Avoid
`IF NOT EXISTS` as a substitute for tracking changes.

For separate migration credentials, configure `SPRING_FLYWAY_URL`,
`SPRING_FLYWAY_USER`, and `SPRING_FLYWAY_PASSWORD` externally. Restrict the runtime
account to the required data operations in such deployments. Local Compose grants
its application account schema privileges so it can perform local migrations.

Flyway `clean` is disabled. MySQL DDL can commit independently of a transaction;
a failed migration can leave partial tables or indexes and a failed history row.
Stop rollout, inspect both history and actual schema, and recover from the verified
backup or explicitly reconcile partial DDL before a reviewed repair/retry. Repair
only fixes history metadata; it does not undo SQL. Do not use automatic repair or
delete an existing volume to silence errors. A code rollback does not reverse DDL.

## Verification and impact

This change affects database startup, schema ownership, Compose and backend builds.
HTTP DTOs and controller/service contracts are unchanged. Existing business state,
financial records, authorization logic and inventory concurrency are not modified.
Gateway and frontend do not run migrations. Fresh installs have no personal/demo
seeds, use `utf8mb4`, and include the additional Flyway history table.

`mvn clean verify` runs MySQL 8.4 Testcontainers tests for application startup,
repeat migration, constraints, checksums, refusal of untracked databases, explicit
baselining, clean protection, and failed-DDL recovery. Tests use an isolated Docker
container and never target the local Compose volume. CI runs these tests in the
backend Maven job; its runner must support Docker. Test-only `docker-java.properties`
selects Docker API 1.44 to work with the Boot-managed client on Docker 25+,
including Docker 29; application runtime configuration is unaffected.

Implementation verification: `mvn -f backend/pom.xml clean verify -B` passed all
seven tests against MySQL 8.4, with zero failures, errors or skips. Compose config
validation and diff whitespace checks passed. The Spring Boot-managed Flyway
11.7.2 logs a compatibility warning that its latest tested MySQL version is 8.1;
the migration tests pass on 8.4. No Flyway version override or major dependency
upgrade was introduced. Vendor-support verification remains necessary before a
production rollout; tests are not a guarantee for untested production workloads.

References: [Spring Boot database initialization](https://docs.spring.io/spring-boot/3.5/how-to/data-initialization.html),
[Flyway MySQL support](https://documentation.red-gate.com/fd/mysql-277579322.html),
[Flyway baselining safety](https://documentation.red-gate.com/fd/flyway-baseline-on-migrate-setting-277578974.html).
