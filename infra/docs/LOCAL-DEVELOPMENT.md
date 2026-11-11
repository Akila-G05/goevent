# Local backend and gateway

Root Compose provides MySQL 8.4 and password-protected, disposable Redis 7.4.
Redis binds only to 127.0.0.1:6380, leaving an existing standalone Redis on 6379
alone. Redis cache/session data is not persisted; restarting/recreating it can
invalidate local sessions. This configuration is not the production Redis plan.

Copy .env.example to .env only if .env does not exist, and set unique database
and Redis passwords. DB_NAME must be goevent_db. Never commit .env. Both Java
applications import ../.env when launched from their module directory, and .env
when launched from root. Plain KEY=value syntax is required; do not put quoted
shell commands or SPRING_CONFIG_IMPORT/SERVER_PORT overrides in the shared file.
The backend uses PORT (8081); gateway uses SERVER_PORT (8080).

From the repository root:

```bash
docker compose up -d --wait mysql redis
docker compose ps
```

Backend, in terminal one:

```bash
cd /home/vinura/Documents/Projects/goevent
unset DB_NAME SERVER_PORT SPRING_CONFIG_IMPORT REDIS_PORT REDIS_PASSWORD BACKEND_URL
mvn -f backend/pom.xml spring-boot:run
```

Gateway, in terminal two:

```bash
cd /home/vinura/Documents/Projects/goevent
unset SERVER_PORT SPRING_CONFIG_IMPORT REDIS_PORT REDIS_PASSWORD BACKEND_URL
mvn -f gateway/pom.xml spring-boot:run
```

Exported shell variables override the shared file, hence clearing obsolete
troubleshooting values above. BACKEND_URL in root .env is the gateway downstream
http://localhost:8081. Frontend settings belong in frontend/.env.local; its existing
/api/v1 rewrite still needs separate alignment with /goevent/api.

```bash
curl -i http://localhost:8081/goevent/api/test
curl -i http://localhost:8080/actuator/health
curl -i http://localhost:8080/goevent/api/test
```

## Existing databases

Changing Compose/.env does not rename a persisted database or update its grants.
The earlier goevent schema remains untouched. Use a reviewed empty goevent_db
and matching database grants for a fresh initialization, or back up and migrate
existing data explicitly. Flyway validates/applies migrations at backend startup.
An existing V1 checksum mismatch must be reconciled with migration history and
forward migrations; do not disable validation, repair blindly or delete volumes.
No migration SQL or database records are changed by this configuration update.

## Change impact and validation

Changes affect Compose dependencies, environment loading, Redis authentication,
local service addresses and database defaults. No API/DTO/business logic or SQL
migration changes. Production disk guards, secrets staging and deployment remain
unchanged. Local .env is updated without printing credentials; a random Redis
password is generated if absent. SQL database names are changed selectively;
project names, DB_USER=goevent and HTTP context /goevent retain their meaning.

Validate with docker compose config --quiet and the isolated runtime smoke harness.
The existing standalone Redis container is not stopped or removed. Rollback must
reconcile Redis host port/password with both application configurations together;
it does not undo database migrations. Never use docker compose down -v.

Executed locally on 2026-11-03: Compose syntax validation passed; the new Redis
service started healthy, rejected unauthenticated PING and accepted authenticated
PING. Both Maven verify/package checks passed (no Java unit test sources).
The isolated real-service smoke passed migration history, JSON binding, gateway
health/routing, Jackson cache round trip, Authorization/Cookie bypass and HTTP
429. Existing MySQL remained running; no existing database/volume was changed.

The legacy CI Quality Gate also initializes MYSQL_DATABASE=goevent_db and uses
DB_NAME=goevent_db. MYSQL_USER/DB_USER remain goevent, the database username.
The CI MySQL service is disposable and does not migrate existing local data.
