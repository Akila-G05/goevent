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
- **Maven 3.9+** (or use included `./mvnw`)
- **Node.js 20+** and **npm**
- **Docker & Docker Compose**

### 1. Start Database

Start MySQL 8.4 LTS locally via Docker Compose:

```bash
docker compose up -d mysql
```

Verify that MySQL is healthy:

```bash
docker compose ps
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

### 3. Run Backend

Navigate to `backend/` and run the Spring Boot application:

```bash
cd backend
mvn spring-boot:run
```

The backend server will start on `http://localhost:8080`.
OpenAPI documentation is available at `http://localhost:8080/swagger-ui/index.html`.

### 4. Run Frontend

In another terminal, navigate to `frontend/`:

```bash
cd frontend
npm install
npm run dev
```

The frontend application will start on `http://localhost:5173`.

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
npm run lint
npm run typecheck
npm run test
npm run build
```
