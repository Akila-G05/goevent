# Admin backend: schema and change-impact assessment

Status: implementation in progress; not deployed.

Implementation now includes management/moderation/reporting APIs and a durable
Azure Communication Services email outbox. Provider delivery remains opt-in and
requires external identity/sender verification; no Azure resources were changed.
See [API and rollout contract](../architecture/admin-backend.md).

The local MySQL 8.4 container was inspected using metadata-only SELECT queries.
`goevent_db` records successful V1, V2 and V3 migrations. Existing roles are USER
(1), ORGANIZER (2), ADMIN (3), STUDENT (4) and contributor (5); account states
are ACTIVE (1), SUSPENDED (2), PENDING (3). Existing event review states are
PENDING (1), APROVED (2), REJECTED (3). Foreign keys use NO ACTION.

V4 must preserve these IDs and existing records. Account deletion must reject
linked records rather than delete history. Coordinator applications must not
reuse account suspension to represent rejected requests. Any rejection or
coordinator revocation preserves ordinary user access. Admin changes require
fresh account/role validation, CSRF protection and durable audit records.

Existing event_dates stores a date and free-form time, without an end instant.
Historical event schedule cannot safely be inferred. Existing payment amounts
are VARCHAR and booking/ticket money is DOUBLE; no currency is recorded. New
financial records use LKR, event scheduling uses Asia/Colombo, and historical
unknown currency/timestamps must remain explicit rather than backfilled guesses.

Affected boundaries: backend authentication/session handling, coordinator
registration, account CRUD, event moderation, reporting queries and SMTP
notification delivery. Frontend, gateway routing, protected MySQL Compose,
Azure resources and production activation are outside this change. No
impersonation is included. JDBC remains the installed persistence approach.

Verification must include real disposable MySQL migrations and foreign keys,
authorization/CSRF/session revocation, concurrent last-admin protection and
moderation decisions, range-filtered reporting and notification retries.
Local/shared databases must not be used for mutation tests. DDL rollback needs
review; reverting Java code does not reverse an applied migration.
