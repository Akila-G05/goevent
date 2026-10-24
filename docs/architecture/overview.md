# GoEvent Architecture Overview

GoEvent is an event planning and ticket booking platform designed as a **modular monolith** with clean architectural layers.

## High-Level Architecture

GoEvent is structured around cohesive business feature modules running inside a single deployable application unit.

```
                      +-----------------------------+
                      |       Vite + React UI       |
                      |   (TanStack Query, Zustand) |
                      +--------------+--------------+
                                     |
                                REST / JSON
                                (OpenAPI)
                                     v
+------------------------------------+------------------------------------+
|                         GoEvent Backend (Spring Boot)                   |
|                                                                         |
|  Presentation Layer (Controllers, DTOs, Security Context)               |
|                                |                                        |
|  Application Layer (Use Cases, Transaction Boundaries, Orchestration)   |
|                                |                                        |
|  Domain Layer (Entities, Value Objects, Domain Policies, Ports)         |
|                                ^                                        |
|  Infrastructure Layer (Spring Data JPA, Hibernate, External Adapters)   |
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

## Module Boundaries and Dependency Direction

1. **Presentation -> Application -> Domain**:
   - Domain logic does not depend on Spring Web, JPA/Hibernate, or third-party payment SDKs.
   - Application layer defines use cases and orchestrates domain policies within transactions.
   - Infrastructure layer implements repository ports and external adapters.

2. **Inter-Module Communication**:
   - Modules do not cross-query other module tables directly.
   - Modules communicate via explicit application service interfaces or public domain contracts.
