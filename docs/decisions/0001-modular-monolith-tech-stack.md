# 1. Technology Decisions and Architecture Baseline

Date: 2026-10-24
Status: Accepted

## Context

GoEvent requires a maintainable, high-integrity architecture capable of handling concurrency-safe ticket reservations, transactional booking and payment workflows, role-based access control, and responsive user experiences.

## Decisions

1. **Architecture Style**: Modular Monolith.
   - Preserves ACID transaction capabilities across local boundaries when needed, avoids premature distributed system complexity, and enforces strict boundary discipline.

2. **Backend**:
   - **Language & Runtime**: Java 21 LTS.
   - **Framework**: Spring Boot 3.4.x, Spring Security, Spring Data JPA (Hibernate).
   - **Database**: MySQL 8.4 LTS (InnoDB, `utf8mb4`).
   - **Migrations**: Flyway versioned migrations (`V...__...sql`).
   - **Schema Policy**: `ddl-auto=validate` in application configurations; all DDL changes managed exclusively by Flyway.
   - **API Documentation**: OpenAPI / Swagger via `springdoc-openapi`.

3. **Frontend**:
   - **Language & Runtime**: TypeScript (strict), Node.js.
   - **Bundler & Framework**: Vite, React (Function components).
   - **Routing**: React Router.
   - **State & Data Fetching**: TanStack Query for remote server state; Zustand for local/client state only where justified.
   - **Styling & UI**: Tailwind CSS, accessible components (shadcn/ui compatible).
   - **Forms & Validation**: React Hook Form + Zod.

4. **Testing Strategy**:
   - Backend: JUnit 5, Mockito, Spring Boot Test, Testcontainers (with real MySQL).
   - Frontend: Vitest, React Testing Library.

## Consequences

- All changes must adhere to modular layering (`presentation`, `application`, `domain`, `infrastructure`).
- No distributed event bus or microservices will be introduced without an explicit ADR.
- Database access must respect module encapsulation (no cross-table joins bypassing application ports).
