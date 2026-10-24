# 2. Separation of Ticketing Domain into Distinct Bounded Contexts

Date: 2026-10-24
Status: Accepted

## Context

The initial scaffolding included a single consolidated `ticket` module. However, event ticketing encompasses three distinct subdomains with differing responsibilities, actors, security characteristics, and transactional lifecycles:

1. **Catalog & Inventory Management**: Creators configuring ticket tiers, pricing, currency, capacity, and stock availability before and during sales.
2. **Post-Purchase Issuance & Delivery**: Generating unpredictable unique ticket numbers, verifiable/signed QR payloads, and delivering issued tickets to attendees upon payment confirmation.
3. **On-Site Verification & Check-in**: High-throughput scanning at gate entrances, verifying signatures, enforcing event scoping, and ensuring atomic, idempotent check-in validation to prevent double entry.

Bundling all three into a single module increases coupling and risks mixing pre-sale inventory concerns with operational check-in security.

## Decision

Split the `ticket` module into three separate modules:

1. `ticketcatalog`:
   - Owns ticket tier definitions, base prices, total/available stock inventory, and reservation hold rules.
   - Internal layers: `presentation`, `application`, `domain`, `infrastructure`.
2. `issuedticket`:
   - Owns issued ticket instances, unique ticket numbers, attendee ticket ownership, and cryptographic QR payload signing.
   - Internal layers: `presentation`, `application`, `domain`, `infrastructure`.
3. `checkin`:
   - Owns attendee verification, gate scanning API, atomic status transition, and audit trail of check-in events.
   - Internal layers: `presentation`, `application`, `domain`, `infrastructure`.

## Consequences

- Clear separation of concerns adhering to Single Responsibility and Bounded Context principles.
- Check-in logic can evolve and scale independently without touching inventory allocation code.
- Inter-module communication between `booking`, `ticketcatalog`, `issuedticket`, and `checkin` must proceed via explicit application interfaces or public contracts.
