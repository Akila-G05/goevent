# GoEvent

GoEvent is a high-integrity, modular monolith event planning and ticket booking platform designed to support event organizers, attendees, and platform administrators.

## Features

- **Organizers / Creators (`ROLE_CREATOR`)**: Manage events, ticket tiers, pricing, stock inventory, promotion codes, sales analytics, and verify attendees via QR code check-in.
- **Attendees / Viewers (`ROLE_VIEWER`)**: Search and discover events, select ticket tiers, checkout with temporary stock reservation, receive verifiable QR tickets, manage personal bookings, and request eligible refunds.
- **Platform Administrators (`ROLE_ADMIN`)**: Moderate events, oversee dispute resolutions, manage platform settings, and audit transactions.

---

## Technology Stack

| Layer | Technology |
| --- | --- |
| **Backend** | Java 21 LTS, Spring Boot 4.0.9, Spring MVC, JDBC/`JdbcTemplate`, Maven |
| **Database** | MySQL 8.4 LTS (InnoDB, `utf8mb4`), Flyway versioned migrations |
| **API Contract** | REST/JSON; OpenAPI is a target, not installed |
| **Frontend** | Next.js 15.5.28 (App Router), React 19.3.1, TypeScript (strict), TanStack Query, Tailwind CSS |
| **Validation** | Zod + React Hook Form; backend Bean Validation is a target |
| **Testing** | JUnit 5, Mockito, Testcontainers (MySQL), Vitest, React Testing Library |
| **Tooling** | Docker & Docker Compose, GitHub Actions |

---

## Repository Structure

```text
goevent/
├── backend/
│   ├── src/main/java/com/goevent/
│   │   ├── GoeventApplication.java
│   │   ├── config/
│   │   ├── controller/
│   │   ├── dto/
│   │   ├── service/
│   │   ├── repository/         # JDBC / JdbcTemplate today
│   │   └── util/
│   ├── src/main/resources/    # application.yml, db/migration/
│   ├── src/test/resources/    # No Java test sources currently
│   └── pom.xml                # Executable WAR via explicit repackage goal
├── gateway/
│   ├── src/main/java/com/goevent/gateway/
│   │   ├── GatewayApplication.java
│   │   ├── config/
│   │   ├── controller/
│   │   └── filter/            # Redis response caching
│   ├── src/main/resources/application.yml
│   └── pom.xml                # Executable JAR
├── frontend/
│   ├── src/                   # app/, components/, lib/, types/, test/
│   ├── package.json
│   ├── bun.lock
│   ├── package-lock.json      # Legacy metadata; Bun runs the app
│   └── next.config.mjs
├── infra/
│   ├── docker/                # Dockerfiles and context-specific ignores
│   ├── ci/                    # Gates, publishing, promotion, runtime smoke
│   ├── compose/               # Application overlay, Caddy/Redis templates
│   ├── deploy/                # Manifest schema, pull deployment and guards
│   ├── systemd/               # Proposed units; not installed automatically
│   ├── security/              # Static analysis rules
│   ├── tests/                 # Deployment policy and negative tests
│   ├── docs/                  # Operator handoff and migration evidence
│   ├── validation/            # Reports; generated binaries/logs ignored
│   └── validate-images.sh
├── docs/architecture/
├── docs/decisions/
├── .github/workflows/         # PR CI, trusted publish, approved promotion
├── .github/dependabot.yml
├── compose.yaml              # Local MySQL and Redis
├── .env.example
└── AGENTS.md
```

---

## Getting Started

### Prerequisites

- **Java 21 LTS**
- **Maven 3.9+** (no Maven wrapper is currently committed)
- **Bun 1.4.4** (for frontend package management and runtime)
- **Docker & Docker Compose**

### 1. Configure Environment

From the repository root, copy the template if you do not already have `.env`:

```bash
cp -n .env.example .env
chmod 600 .env
```

Set distinct random `DB_PASSWORD` and `DB_ROOT_PASSWORD` values before starting
MySQL. For example, generate each with `openssl rand -hex 24`. Keep `.env` local
and untracked. Use plain, unquoted `KEY=value` lines as described in the template
so Docker Compose and Spring's properties importer interpret values consistently.

### 2. Start Database

```bash
docker compose up -d --wait mysql redis
docker compose ps
```

Compose reads the root `.env`, creates `DB_NAME` (default `goevent_db`), and grants
`DB_USER` access to that database. Compose starts MySQL without creating tables;
Flyway creates and versions the schema when the backend starts.

Existing volumes are preserved: changing `.env` does not change existing MySQL
users/passwords or rename a database. Use matching credentials. Databases that
already contain tables require an explicitly reviewed baseline before starting
the updated backend; see [database migrations](docs/architecture/database-migrations.md).
Do not delete an existing volume to adopt Flyway.

### 3. Run Backend

```bash
cd backend
mvn spring-boot:run
```

Spring imports the root `.env` automatically when launched from `backend/` or
the repository root; no shell sourcing is needed. Exported environment variables
can override the file. IDE runs should use one of those working directories.
The datasource uses `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`;
the backend does not use the MySQL root account. `DB_HOST=localhost` and the
published `DB_PORT` are for a backend running on the host.

The backend listens on `http://localhost:8081/goevent` by default (`PORT` can
override the port). Its test endpoint is `/goevent/api/test`. The separate gateway
uses port 8080; OpenAPI is not currently installed in the backend.

### 4. Run Frontend

In another terminal, navigate to `frontend/`:

```bash
cd frontend
bun install --frozen-lockfile
bun run dev
```

The frontend application will start on `http://localhost:3000`.

---

## Testing & Quality Gates

### Backend Tests

```bash
cd backend
mvn clean verify
```

Neither Java module currently has Java test sources. Maven verification checks
compilation and packaging; it does not demonstrate business regression coverage.
For the executable backend and isolated service smoke test, from the root run:

```bash
mvn -B -ntp -f backend/pom.xml verify org.springframework.boot:spring-boot-maven-plugin:4.0.9:repackage
mvn -B -ntp -f gateway/pom.xml verify
python3 infra/ci/runtime_smoke.py
```

The harness requires Docker and uses disposable MySQL/Redis, never the existing
Compose database. See [migration validation](infra/docs/DEPENDENCY-MIGRATION.md)
for tested flows and remaining OAuth/end-to-end limitations.

### Frontend Tests & Typecheck

```bash
cd frontend
bun run lint
bun run typecheck
bun run test
bun run build
```

## Gateway and deployment

The separate gateway uses Spring Cloud 2025.1.4, Redis rate limiting and response
caching. Start Redis with `docker compose up -d --wait mysql redis`; root Compose supplies
MySQL and authenticated local Redis. Backend sessions also use Redis. Gateway forwards `/goevent/api/**` to
backend port 8081; Next defaults to `/api/v1`, so the API base/proxy configuration
must be reconciled before claiming a working end-to-end login.

The production plan preserves Vercel frontend hosting and Azure VM Compose with
Caddy, the separate gateway/backend, protected MySQL managed disk, Key Vault and
Managed Identity. PR CI has no production credentials; trusted main publishes
scanned digests via OIDC; approved promotion prepares VM-pulled deployment intent.
Azure/GitHub configuration and staging validation remain owner-operated steps.
See [operator guide](infra/README.md) and [dependency migration](infra/docs/DEPENDENCY-MIGRATION.md).
Spring Security/JPA and domain features described above remain implementation
targets; they are not implied by dependency upgrades.

Local service commands and database-volume caveats: [local development guide](infra/docs/LOCAL-DEVELOPMENT.md).
