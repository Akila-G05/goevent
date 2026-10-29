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
| **Backend** | Java 21 LTS, Spring Boot 3.4, Spring Security, Spring Data JPA (Hibernate ORM), Maven |
| **Database** | MySQL 8.4 LTS (InnoDB, `utf8mb4`), Flyway versioned migrations |
| **API Contract** | REST/JSON, OpenAPI (Swagger UI) |
| **Frontend** | Next.js (App Router), React, TypeScript (strict), TanStack Query, Tailwind CSS |
| **Validation** | Jakarta Bean Validation (Backend), Zod + React Hook Form (Frontend) |
| **Testing** | JUnit 5, Mockito, Testcontainers (MySQL), Vitest, React Testing Library |
| **Tooling** | Docker & Docker Compose, GitHub Actions |

---

## Repository Structure

```text
goevent/
├── frontend/                # Next.js App Router application
│   ├── src/
│   │   ├── app/             # App Router layout, pages, route handlers
│   │   ├── components/ui/   # Reusable UI primitives
│   │   ├── components/shared/
│   │   ├── lib/             # API client, HTTP interceptors, utilities
│   │   └── types/
│   ├── package.json
│   └── next.config.mjs
├── backend/                 # Spring Boot layered architecture
│   ├── src/main/java/com/goevent/
│   │   ├── GoeventApplication.java
│   │   ├── config/          # OpenAPI, WebConfig
│   │   ├── security/        # Spring Security, roles
│   │   ├── common/          # Shared ApiResponse, exception handler
│   │   ├── controller/      # REST API controllers
│   │   ├── dto/             # Request & response DTOs
│   │   ├── service/         # Business logic & transaction boundaries
│   │   ├── repository/      # Spring Data JPA repositories
│   │   └── entity/          # JPA entities
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/    # Flyway versioned SQL migrations
│   └── pom.xml
├── docs/                    # Architecture documentation & decisions (ADRs)
├── .github/workflows/       # CI quality gates
├── compose.yaml             # Local MySQL 8.4 LTS configuration
├── .env.example             # Environment configuration template
└── AGENTS.md                # Engineering instructions and conventions
```

---

## Getting Started

### Prerequisites

- **Java 21 LTS**
- **Maven 3.9+** (no Maven wrapper is currently committed)
- **Bun 1.1+** (for frontend package management and runtime)
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
docker compose up -d --wait mysql
docker compose ps
```

Compose reads the root `.env`, creates `DB_NAME` (default `goevent`), and grants
`DB_USER` access to that database. The mounted `init.sql` populates that selected
database on the **first startup of an empty MySQL data directory**. It is a local
bootstrap dump, not a Flyway migration; Flyway is not currently configured.

Existing volumes are preserved: changing `.env` does not change existing MySQL
users/passwords, rename a database, or rerun the SQL. For an existing database,
use its current credentials and database name, or plan an explicit migration.
Do not delete a volume containing data to apply this setup. The bootstrap dump's
existing column types, seed data, and table character sets are unchanged.

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
bun install
bun run dev
```

The frontend application will start on `http://localhost:3000`.

---

## Testing & Quality Gates

### Backend Tests

```bash
cd backend
mvn verify
```

### Frontend Tests & Typecheck

```bash
cd frontend
bun run lint
bun run typecheck
bun run test
bun run build
```
