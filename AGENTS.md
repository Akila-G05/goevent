# AGENTS.md — GoEvent Engineering Instructions

> Repository-wide instructions for AI coding agents and contributors working on **GoEvent**, an event planning and ticket booking platform. Follow these rules for every change. Repository source code and its actual configuration are the source of truth; do not invent files, scripts, endpoints, or passing test results.

## 1. Read first and inspect the repository

Before editing, read this file, `README.md`, and any existing `CONTRIBUTING.md`, `DESIGN.md`, architecture decision records, relevant module documentation, and nearby tests. If `.agents/skills/` or project-specific agent instructions exist, read the appropriate instructions before invoking them. The uploaded reference project's Next.js, Bun, Drizzle, and PostgreSQL-specific instructions **do not apply** to GoEvent.

Start each task by inspecting the working tree and nearby code:

```bash
git status --short
git branch --show-current
git remote -v
rg --files -g '!node_modules' -g '!dist' -g '!target'  # if ripgrep is installed
```

If a command is unavailable, use an equivalent. Determine which framework versions, scripts, and conventions are actually installed. Never overwrite, reset, clean, stash, amend, or reformat another contributor's unrelated work. Do not proceed with a destructive action without explicit authorization.

## 2. Project overview and fixed technology decisions

GoEvent supports three roles:

- **Event creators / organizers:** manage events, ticket tiers, prices, inventory, attendees, QR check-in, promotions, and sales reporting.
- **Viewers / attendees:** discover events, select tickets, use a cart, pay, receive QR tickets, review bookings, and request eligible refunds.
- **Administrators:** manage users, moderate events, configure supported payments and platform settings, review disputes, and monitor reports.

| Area | Approved technology / approach |
| --- | --- |
| Application | Monolith with clean Layered Architecture |
| Frontend | Next.js (App Router), React, TypeScript (strict) |
| Frontend tooling | **Bun** (runtime, package manager, and script runner) |
| UI | Tailwind CSS and accessible components / shadcn/ui (where configured) |
| Frontend routing | Next.js App Router |
| Data fetching | TanStack Query; Axios or the existing typed HTTP client |
| Client-only state | React state / Zustand where justified |
| Forms | React Hook Form + Zod (where configured) |
| Backend | Java 21 LTS, Spring Boot, Maven (Layered: controller, service, repository, entity, dto) |
| Security | Spring Security with explicit role/ownership checks |
| Persistence | Spring Data JPA with Hibernate ORM |
| Database | **MySQL 8.4 LTS**, InnoDB, `utf8mb4` |
| Schema migrations | Flyway versioned SQL migrations |
| API contract | REST/JSON, OpenAPI documentation |
| Testing | JUnit, Mockito, Spring Boot Test, Testcontainers; Vitest, React Testing Library, Playwright |
| Local tooling | Docker / Docker Compose when configured; Bun for frontend |
| CI & collaboration | GitHub Actions, branches, pull requests, protected `main` |

Per maintainer decision (ADR 0003), Next.js (App Router) with Bun package management is the approved frontend stack and Layered Architecture is the approved backend structure. Do not switch to Node.js backend, Prisma, Drizzle, PostgreSQL, microservices, or event buses without an explicit, documented architectural decision and maintainer approval. Align dependency versions to the repository's build files; do not independently upgrade major versions.

## 3. Expected repository structure

Prefer this layout for the GoEvent repository:

```text
goevent/
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router (layout, pages, route handlers)
│   │   ├── components/ui/       # Reusable UI primitives
│   │   ├── components/shared/   # Cross-feature components
│   │   ├── hooks/
│   │   ├── lib/                 # API client, auth integration, utilities
│   │   └── types/
│   ├── package.json
│   └── next.config.mjs
├── backend/
│   ├── src/main/java/com/goevent/
│   │   ├── GoeventApplication.java
│   │   ├── config/              # OpenApiConfig, WebConfig, etc.
│   │   ├── security/            # SecurityConfig, UserRole
│   │   ├── common/              # ApiResponse, GlobalExceptionHandler
│   │   ├── controller/          # REST API controllers
│   │   ├── dto/                 # Request and Response DTOs
│   │   ├── service/             # Business logic & transaction boundaries
│   │   ├── repository/          # Spring Data JPA repositories
│   │   └── entity/              # JPA entity models
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/        # Flyway V...__...sql files
│   ├── src/test/
│   └── pom.xml
├── docs/architecture/
├── docs/decisions/
├── .github/workflows/
├── .env.example             # placeholders only
├── compose.yaml             # when configured
└── AGENTS.md
```

### Dependency direction and boundaries

- **Controller → Service → Repository / Entity.**
- Controllers handle HTTP transport concerns, input validation, authentication context, and response mapping—not business rules or SQL.
- Services coordinate business logic, use cases, and transaction boundaries (`@Transactional`).
- Repositories own Spring Data JPA database access and custom queries.
- Entities represent relational persistence mappings and protect state invariants.

## 4. Object-oriented programming and Java standards

- Apply **encapsulation, abstraction, polymorphism**, and **inheritance only when it represents a real is-a relationship**. Prefer composition when sharing behavior.
- Follow **SOLID**, DRY (without premature generalization), KISS, and separation of concerns.
- Use meaningful classes, methods, interfaces, and explicit access modifiers. Prefer immutable value objects and constructor injection. Do not use field injection.
- Protect aggregate invariants: e.g., ticket stock must not become negative, a checked-in ticket cannot be checked in twice, and paid bookings cannot silently revert to unpaid.
- Represent monetary amounts with `BigDecimal` and an explicit currency, never `double` or `float`. Define rounding policy and precision consistently.
- Persist timestamps using an explicit timezone strategy (typically UTC instants) and convert to event-local time at the boundary.
- Use enums/value objects for domain states and a documented transition policy. Avoid magic strings and numbers.
- Keep transactional operations short and explicit; do not perform network payment requests inside a long-held database transaction.
- Use Jakarta Bean Validation for request DTOs; validate business rules in the application/domain as well. Do not rely on frontend validation.
- Return stable HTTP error responses (consistent structure, codes, correlation IDs where configured), without leaking stack traces or sensitive details.
- Avoid unnecessary abstract classes, factories, and interfaces; use abstractions at meaningful external/changeable boundaries.

## 5. Frontend React standards

- Use function components, strict TypeScript, and focused feature directories. Avoid `any`; use `unknown` with narrowing when appropriate.
- Follow React hook rules, stable list keys, effect dependency rules, and accessible HTML semantics.
- Route views should compose feature components; avoid giant components and business logic embedded in JSX.
- Prefer TanStack Query for remote server state and query invalidation; do not duplicate backend source-of-truth state in Zustand. Zustand is for genuine client/UI needs such as local cart editing where appropriate.
- Validate forms with Zod and render loading, empty, error, validation, and success states.
- Use existing shadcn/ui components and design tokens; ensure keyboard access, labels, focus indicators, and responsive behavior.
- Never put secrets, trusted authorization decisions, raw payment credentials, or authoritative ticket prices in the browser.
- Treat API responses as untrusted, escape user-generated content, and avoid `dangerouslySetInnerHTML` unless content is sanitized and the approach reviewed.
- Keep API DTOs consistent with backend contracts; update both sides when contracts change.

## 6. Domain-specific safety invariants

**Ticketing and inventory**
- Enforce capacity and per-ticket-type limits on the server. Use concurrency-safe stock reservation (atomic update/optimistic locking/row lock as justified), an expiry for unpaid holds, and database constraints where applicable.
- Do not treat cart contents as a confirmed reservation. Handle concurrent checkout, expired holds, retries, cancellations, and failed payments.
- Every issued ticket has an unpredictable unique identifier; QR payloads must be signed or otherwise verifiable and scoped to the correct event/ticket. Check-in must be atomic and idempotent against duplicates.

**Payments, refunds, and payouts**
- Never mark a booking as paid based only on a client redirect or client-supplied success flag. Verify payment provider callbacks/signatures or status server-to-server.
- Make webhook processing idempotent; persist provider event IDs/transaction references and protect against replay, duplicate delivery, and out-of-order events.
- Use a provider-hosted/tokenized checkout. Do not store card PAN, CVV, or payment secrets. Preserve financial audit trails, apply cancellation policy, and prevent double refunds/payouts.
- Clearly distinguish gross sales, discounts, service fees, refunds, net earnings, and payout state in reports.

**Access and moderation**
- Roles: `ROLE_VIEWER`, `ROLE_CREATOR`, `ROLE_ADMIN` or consistently configured equivalents. Enforce resource ownership: creators may change **their own** events only; viewers access **their own** bookings; admins have separately audited elevated operations.
- Published-event visibility, event moderation, status transitions, and cancellation rules must be checked on the server.
- Prefer soft deletion/status transitions where bookings, payments, or audit history exist; never cascade-delete financial records accidentally.

## 7. MySQL, Hibernate, and migration safety

- **MySQL is the only supported production relational database** unless a decision explicitly changes this. Use InnoDB and `utf8mb4`; define foreign keys, unique constraints, and indexes based on query patterns.
- Use **Spring Data JPA backed by Hibernate**; do not use a parallel ORM or raw SQL everywhere. SQL is appropriate for Flyway migrations or measured, reviewed query needs.
- **Flyway owns schema changes.** Commit ordered, versioned SQL files under `backend/src/main/resources/db/migration/`. Never rely on `hibernate.hbm2ddl.auto=update` or `create` in shared/production environments. Use `ddl-auto=validate` (or `none` where configured).
- Do not modify an already-applied migration; create a new forward migration. Validate migrations and check Hibernate mappings against the resulting schema.
- Prefer expand → backfill → contract for breaking schema changes; coordinate database and application rollout. Review locks, data volume, rollbacks, defaults, nullability, and indexing before applying schema changes.
- Take and **verify** an authorized backup before risky production migrations. Do not run production migrations, destructive SQL, or data exports without explicit approval and an appropriate recovery plan.
- Configure app runtime DB credentials with least privilege; separate migration credentials where possible. Never log customer personal data or payment tokens.
- Avoid N+1 loading, unbounded result sets, and accidental eager loading. Paginate searchable lists; use projections or explicit fetch plans where needed.
- Use transactions for reservation/payment state coordination and reliable outbox or other durable coordination when eventual delivery is needed; do not assume a DB transaction covers external APIs.

## 8. Mandatory blast-radius analysis — before every code change

Before implementing **any new feature, fix, refactor, or schema/API change**, examine the impact beyond the target file. For small changes, a few lines in the PR are sufficient; for cross-cutting changes, write a short analysis in the PR description or `docs/decisions/`.

1. **Understand baseline:** existing behavior, expected behavior, invariants, consumers, tests, and relevant documentation.
2. **Trace dependencies:** callers/callees, public contracts, frontend routes, API endpoints, DTOs, role checks, service interfaces, event/ticket/booking/payment flows, queries, migrations, jobs, and external provider integrations.
3. **Classify risk:** low (isolated UI/copy), medium (feature behavior or API changes), high (auth, payments, inventory, booking state, shared types, schema, migrations, concurrency, production config).
4. **Plan compatibility:** preserve old contracts where possible; use additive changes, adapters, feature flags when justified, and expand–migrate–contract for schema evolution. Identify a rollback/recovery approach for high-risk changes.
5. **Implement narrowly:** smallest cohesive diff; do not silently reformat unrelated files, rename public fields, or delete code used elsewhere.
6. **Verify affected flows:** unit, integration, API contract, UI/E2E, security/ownership, migration, and concurrency tests proportional to risk.
7. **Document evidence:** mention touched modules, possible downstream effects, tests run and results, untested areas, and mitigation in the PR.

**Change impact checklist (copy into the PR when relevant):**

```text
- Change / reason:
- Modules, interfaces, and consumers affected:
- API / DTO compatibility:
- Schema, Hibernate mapping, migration, and data impact:
- Auth / ownership / privacy impact:
- Ticket stock / booking / payment / refund concurrency impact:
- Frontend states and accessibility impact:
- Rollback or compatibility plan:
- Tests run (including regression coverage) and results:
- Remaining risks / manual verification:
```

Never declare a change “safe” solely because it compiles or its own unit test passes.

## 9. Testing and quality gates

Use installed scripts/commands verified from `frontend/package.json` and `backend/pom.xml`. **The examples below are conditional, not a claim that scripts already exist.**

```bash
# Frontend (from frontend/)
bun install                # or: bun install --frozen-lockfile
bun run lint               # when defined
bun run typecheck          # when defined
bun run test               # when defined
bun run build

# Backend (from backend/)
./mvnw verify              # if Maven wrapper is committed
# or: mvn verify
```

- Backend: unit-test domain rules and use cases with JUnit/Mockito; integration-test JPA, MySQL migrations, and Spring Security with Spring Boot Test + Testcontainers using **MySQL**, not an incompatible in-memory substitute for critical DB behavior.
- Frontend: use Vitest/React Testing Library for UI logic and Playwright for purchase and access-control journeys when configured.
- Add regression tests for bug fixes. High-risk changes need concurrency/race, authorization, retry/idempotency, and failure/recovery coverage.
- Critical end-to-end scenarios: creator creates/publishes an event; viewer finds it; two buyers compete for last ticket; checkout succeeds/fails; webhook retries; ticket download and double-check-in prevention; cancellation/refund; viewer cannot access others' bookings; creator cannot edit another creator's event; admin moderation.
- Keep test data isolated. Never run destructive integration tests against production/shared DBs. Never commit skipped/focused tests as a workaround.
- Check formatting/static analysis, dependency vulnerabilities, build, migration validity, and changed API contracts before PR. Do not weaken checks merely to make CI green.
- If tests or tools cannot run, report the exact limitation; **never claim they passed**.

## 10. Security, privacy, and operational precautions

- Follow OWASP-style secure defaults: validate input, enforce server-side authorization, use CSRF protection where relevant to chosen auth method, apply secure session/cookie settings, use HTTPS, rate-limit sensitive endpoints, and defend against injection and broken object-level authorization.
- Keep credentials and personally identifiable data out of logs, exceptions, test fixtures, generated assets, and Git. Commit only `.env.example` with placeholders; use environment variables or secret management for actual values.
- Treat attachments and event images as untrusted: validate type/size, randomize storage names, constrain access, and scan when applicable.
- Avoid sensitive details in frontend environment variables (Vite `VITE_*` values are public at build time).
- Review dependencies, licenses, maintenance, transitive vulnerabilities, and lifecycle hooks before adding packages.
- Protect operational actions (bulk delete, mass refunds, schema changes, deploys, production data access) with explicit authorization and auditable procedures.
- Use structured operational logs/metrics with correlation IDs where configured; do not log payment gateway secrets, authentication tokens, attendee personal details, or QR validation secrets.

## 11. Git branches, commits, pushing, and pull requests — required workflow

**Do not directly commit or push feature work to `main` or another protected branch.** Each contributor works on their own task branch and submits a pull request.

### Branch detection and safe creation

1. Check `git status --short`, `git branch --show-current`, and local/remote branch status before editing or staging.
2. If already on a suitable contributor-owned feature branch for the current task, continue on it; **do not create redundant branches**.
3. If on `main`, `master`, a protected branch, or detached HEAD, create a new branch **before making changes**: `<name>/<feature-name>` (lowercase kebab-case; `name` is the contributor's agreed Git/team handle, e.g. `amal/event-ticket-pricing`). Ask for or use a verified contributor handle; do not invent a person's identity.
4. A branch name must not contain spaces or secrets. For fixes, examples include `amal/fix-ticket-overselling`; for features, `nimal/event-search-filters`.
5. Start from a current, clean base when possible. **Never force-switch branches with uncommitted work** or automatically stash/discard anyone else's changes. If the working tree is dirty, preserve it and request a safe handoff/permission or use a separate worktree when explicitly allowed.

Example (only after inspecting the worktree):

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c amal/event-ticket-pricing
```

The example assumes a clean worktree, an existing `main`, and authorized network access; adapt to the repository. Do not blindly run it.

### Commit and PR policy

- Review `git diff` and `git status`; stage only files belonging to the task (prefer `git add <paths>`, not unconditional `git add .`).
- Use Conventional Commits: `feat(tickets): add tier pricing`, `fix(bookings): prevent duplicate reservation`, `test(payments): cover webhook replay`, `docs(repo): update architecture rules`.
- Keep commit and PR subjects imperative, concise, and appropriately scoped. Do not include secrets or personal data in commits.
- Run applicable tests and checks **before pushing**. Never bypass hooks or use `--no-verify` to avoid failures without maintainer approval.
- On a user-authorized upload/publish request, push **only** the current feature branch, e.g. `git push -u origin amal/event-ticket-pricing`.
- **Create a pull request** from that branch into the repository's default branch, preferably as a draft if incomplete. Include summary, linked issue if any, screenshots for UI changes, blast-radius analysis, test evidence, migration/rollback notes, and risks.
- If GitHub CLI is installed and authenticated, example: `gh pr create --base main --head amal/event-ticket-pricing --title "feat(tickets): add tier pricing" --body-file pr-body.md`. Otherwise provide a compare URL or steps. Do not invent a PR URL/number or claim one exists before confirming it.
- Never merge the PR without the required reviews/checks, never force-push shared branches, and never push to another contributor's branch without consent.
- When an environment or instruction prohibits external Git actions, prepare and verify the changes locally and **report that push/PR creation was not performed**. Agent instructions do not grant permission to publish, deploy, or modify production systems.

**Recommended GitHub protection:** protect `main`, require pull requests, at least one reviewer, passing frontend/backend CI and security checks, and block force pushes. This protection must be configured in GitHub; this file alone cannot enforce it.

## 12. Documentation, API changes, and Definition of Done

- Keep OpenAPI schemas and API examples consistent with controller/DTO behavior. Document status codes, permissions, pagination, input limits, and breaking changes.
- Update `README.md`, `.env.example`, diagrams, and architecture decisions when setup/behavior/stack changes. Avoid creating references to files that do not exist.
- Prefer small, reviewable PRs. Document intentionally deferred tasks rather than adding placeholders that silently fail.

A change is **done** only when:

1. The correct feature branch was used and no unrelated work was disturbed.
2. The impact/blast-radius assessment has been completed.
3. OOP, SOLID, module/layer boundaries, and role/ownership rules are respected.
4. Relevant tests, lint/type checks, builds, and migration checks pass (or limitations are explicitly reported).
5. API and database compatibility, error cases, concurrency, and security have been considered.
6. Documentation and schema migrations are included when needed.
7. `git diff` and `git status` are reviewed for accidental files, secrets, and unrelated edits.
8. On an **authorized** publication task, changes were pushed to the contributor branch and a PR was created; otherwise the unperformed steps are clearly stated.
9. Final handoff states **what changed**, **why**, **what was actually tested**, **remaining risks**, and **the branch/PR status**.

**Priority rule:** When instructions conflict, follow system/developer/user instructions, repository safety constraints, and explicit maintainer decisions over this file. If requirements are ambiguous or an operation is risky, do not guess or perform irreversible actions.
