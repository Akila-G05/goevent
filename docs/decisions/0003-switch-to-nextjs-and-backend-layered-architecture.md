# 3. Adopt Next.js with Bun for Frontend and Layered Architecture for Backend

Date: 2026-10-24
Status: Accepted

## Context

Following maintainer review, the project architecture has been updated to optimize developer workflow, server-side rendering capabilities, and architectural clarity:
1. **Frontend**: Vite + React SPA is transitioned to **Next.js (App Router)** with **Bun** as the approved runtime, package manager, and script runner. This provides improved SEO for public event discovery, native server components, integrated routing, ultra-fast dependency management, and modern full-stack developer ergonomics.
2. **Backend**: Package-by-feature modular monolith structure is transitioned to **Layered Architecture (Package-by-Layer)**. This simplifies component discovery, standardizes Spring Boot layering across the codebase, and reduces boilerplate across packages.

## Decision

1. **Frontend Tech Stack**:
   - Framework & Tooling: Next.js (App Router) with React 18, strict TypeScript, and **Bun** (`bun.lock`).
   - Styling: Tailwind CSS with PostCSS.
   - State & Data Fetching: TanStack Query (React Query) and Axios client with custom interceptors.
   - Directory Layout:
     - `src/app/`: Next.js App Router (`layout.tsx`, `page.tsx`, `globals.css`, route handlers).
     - `src/components/ui/`: Reusable, accessible UI primitives.
     - `src/components/shared/`: Shared navigation and cross-cutting components.
     - `src/lib/`: API client and utility functions.
     - `src/types/`: Shared TypeScript DTO interfaces.

2. **Backend Architecture**:
   - Adopt standard Spring Boot Layered Architecture:
     - `com.goevent.controller`: Presentation layer (REST API controllers, request mappings).
     - `com.goevent.dto`: Request and response data transfer objects.
     - `com.goevent.service`: Business logic, workflows, and transaction boundaries (`@Transactional`).
     - `com.goevent.repository`: Persistence layer (Spring Data JPA interfaces).
     - `com.goevent.entity`: Domain entity mappings (JPA entities, enums).
     - `com.goevent.config`: System configurations (OpenAPI, WebMvc, CORS).
     - `com.goevent.security`: Spring Security configuration, filters, roles.
     - `com.goevent.common`: Shared envelopes (`ApiResponse`), global exception handlers.

## Consequences

- Next.js and Bun replace Vite and npm build scripts in CI (`bun install --frozen-lockfile`, `bun run build`, `bun run lint`).
- Backend packages follow standard layer-by-layer convention, making it straightforward to add new controllers, services, entities, and repositories.
- MySQL 8.4 LTS, Flyway migrations (`V...__...sql`), and `ddl-auto: validate` remain strictly enforced.
