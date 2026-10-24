# GoEvent Architecture Overview

GoEvent is an event planning and ticket booking platform built with **Next.js (App Router)** on the frontend and a robust **Layered Architecture Spring Boot backend**.

## High-Level Architecture

```
                      +-----------------------------+
                      |    Next.js 14 App Router    |
                      |  (React, Query, Tailwind)   |
                      +--------------+--------------+
                                     |
                                REST / JSON
                                (OpenAPI)
                                     v
+------------------------------------+------------------------------------+
|                         GoEvent Backend (Spring Boot)                   |
|                                                                         |
|  Controller Layer (REST Controllers, DTOs, Web Security Context)        |
|                                |                                        |
|  Service Layer (Business Logic, Workflows, @Transactional Boundaries)   |
|                                |                                        |
|  Repository Layer (Spring Data JPA Repositories)                        |
|                                |                                        |
|  Entity Layer (JPA Entities, Enums, Relational Mapping)                 |
+------------------------------------+------------------------------------+
                                     |
                                     v
                          MySQL 8.4 LTS (InnoDB, utf8mb4)
                          Migrations: Flyway
```

## Role Model

1. **Viewer / Attendee (`ROLE_VIEWER`)**:
   - Event discovery, search, and filtering.
   - Ticket selection, temporary cart holds, and checkout.
   - Receiving cryptographically verifiable QR tickets.
   - Viewing personal bookings and requesting eligible refunds.

2. **Event Creator / Organizer (`ROLE_CREATOR`)**:
   - Managing creator-owned events, venues, and ticket tiers.
   - Inventory controls, tier pricing, and promotions.
   - Attendee lists and QR code check-in validation.
   - Sales reporting and revenue dashboards.

3. **Administrator (`ROLE_ADMIN`)**:
   - Platform moderation and event reviews.
   - User account management and dispute resolution.
   - System settings and financial audit tracking.

## Backend Layered Architecture

The backend follows a clean **Package-by-Layer** pattern:

| Package | Layer | Responsibilities |
| --- | --- | --- |
| `com.goevent.controller` | Presentation | Handles incoming HTTP requests, input validation, and response serialization. |
| `com.goevent.dto` | Data Transfer | Defines structured request and response contracts. |
| `com.goevent.service` | Business Logic | Coordinates business rules, domain calculations, and transaction boundaries (`@Transactional`). |
| `com.goevent.repository` | Persistence | Owns Spring Data JPA repositories and query execution. |
| `com.goevent.entity` | Data Model | Encapsulates relational entities, fields, constraints, and audit timestamps. |
| `com.goevent.security` | Security | Manages Spring Security filter chain, JWT authentication, and role authorization. |
| `com.goevent.common` | Cross-Cutting | Standard JSON envelopes (`ApiResponse<T>`) and global exception handling. |

## Frontend Next.js Architecture

The frontend uses the modern **Next.js App Router**:

- `src/app/`: File-system routing with root layout, error boundaries, providers, and page views.
- `src/components/ui/`: Reusable, accessible UI primitives (buttons, inputs, modals).
- `src/components/shared/`: Shared application components (navigation bar, layout wrappers).
- `src/lib/`: Typed Axios client (`api-client.ts`) with request/response interceptors.
- `src/types/`: Shared TypeScript contracts matching backend REST DTOs.
