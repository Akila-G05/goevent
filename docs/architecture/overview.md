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

## Feature Modules

The backend modular monolith is organized into 11 focused business modules:

| Module | Core Responsibility |
| --- | --- |
| `auth` | Authentication, credentials, session/JWT token lifecycle |
| `user` | User profiles, account settings, roles (`ROLE_VIEWER`, `ROLE_CREATOR`, `ROLE_ADMIN`) |
| `event` | Event creation, venue details, schedules, status lifecycle (`DRAFT`, `PUBLISHED`, `CANCELLED`, `COMPLETED`) |
| `ticketcatalog` | Ticket tiers, pricing, stock inventory, and reservation hold rules |
| `issuedticket` | Confirmed ticket instances, unique ticket numbers, verifiable QR code payload signing |
| `checkin` | Gate attendee scanning, cryptographic verification, atomic check-in execution, double check-in prevention |
| `cart` | Client/temporary ticket selections and preliminary price calculations |
| `booking` | Reservation coordination, expiry timers, order status transitions |
| `payment` | Payment gateway integration, tokenized checkout, idempotent webhook processing |
| `notification` | Transactional emails, booking confirmations, QR ticket delivery |
| `reporting` | Organizer sales metrics, attendance rates, revenue and payout breakdowns |

## Module Boundaries and Dependency Direction

1. **Presentation -> Application -> Domain**:
   - Domain logic does not depend on Spring Web, JPA/Hibernate, or third-party payment SDKs.
   - Application layer defines use cases and orchestrates domain policies within transactions.
   - Infrastructure layer implements repository ports and external adapters.

2. **Inter-Module Communication**:
   - Modules do not cross-query other module tables directly.
   - Modules communicate via explicit application service interfaces or public domain contracts.
