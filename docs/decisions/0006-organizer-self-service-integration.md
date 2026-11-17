# 0006 — One organizer interface and self-service publication

Status: owner-approved direction, implemented locally.

The owner chose Akila's PR #72 interface (`e5423b2`) as the organizer experience,
replacing the separate coordinator dashboard and public admin dashboard. Signup
must offer User or Organizer for both manual and Google accounts. Organizers are
active immediately and publish their own listing events without admin review.
Organization/position information is self-reported; it is not a verified claim.
Existing student/admin/contributor role IDs and historical audit records remain
compatible, but those are not new signup choices.

## Baseline and blast radius

The PR forked before coordinator/security work and had nine text conflicts plus
incompatible event-writing contracts and a duplicate V5 migration. Integration
starts from current main on `vinura/organizer-integration`; Akila's application
changes are incorporated with narrow adaptations. The existing V1–V5 migrations
are immutable. Read-only local metadata inspection found V1–V5 successfully
applied, 48 tables and two organization links; no shared data was changed. Azure
was not inspected. Incoming, locally unapplied listing-link/status migrations are
V6/V7. Owners must check every target Flyway history before deployment, including
whether Akila's original V5/V6 were applied on another development database; never
rename already-applied history or enable automatic baseline/repair.

Affected: registration transactions, frontend auth/signup/profile/navigation,
event DTOs and REST contracts, image requests, public discovery/detail, saved
items, migration ordering and related tests. High risk for authentication,
visibility and schema compatibility; medium for frontend replacement. HTTP
business logic stays Controller → Service → JDBC Repository.

## Implementation boundary

- Keep Akila's profile/My Events, event form, discovery/detail and calendar UI.
  `/coordinator` redirects to Profile; `/admin` and its preview return 404.
- Preserve protected legacy admin/coordinator backend services, clients needed by
  shared legacy components and audit/revision tables for compatibility. They are
  not entry points or approval dependencies of the new product flow. Removing
  historical APIs/data is a separate reviewed retirement, not an automatic drop.
- Manual/verified Google registration calls a DB-only transactional service. New
  User/Organizer accounts are active; organizer registration requires a real
  organization and bounded position. No client may self-register an admin or
  supply an event owner/publication state. Existing pending/suspended accounts
  are not silently activated. Existing student accounts can still sign in.
- Event writes require fresh active-account and organizer-role checks, ownership
  and CSRF, including JSON, image and saved-event mutations. Existing session
  replacement, secure-cookie configuration and private upload permissions remain.
- New listing events publish directly. Metadata edits use row locks and revision
  conflicts and clear obsolete publication pointers while retaining revision
  history. Non-listing, cancelled or booking-linked metadata edits are rejected;
  there is no automatic refund, financial rewrite or ticketing implementation.
- Public reads exclude disabled events. Saved-event operations reject inactive
  accounts. Map resolution has bounded redirects/cache, trusted HTTPS Google
  targets and no network calls within a DB transaction; unavailable map resolution
  falls back to the stored address. Existing host egress policy is not broadened.
- Organization profile changes preserve prior links instead of rewriting other
  organizations' history. A self-selected active link is not admin verification.

## Infrastructure preservation and rollback

No changes to `infra/`, gateway, workflows, production configuration, root Compose,
Key Vault/MI bootstrap, TLS, filesystem/disk guards, passwords, release policy,
backup evidence, existing migrations or delivery switches are part of this work.
No shared migration, deployment, real email, commit or push is authorized here.
Rollback application behavior by reverting this integration and restoring its
frontend/backend pair together. Preserve additive migration data and image/audit/
booking/payment history. No DDL rollback or Flyway history rewriting is provided.
Legacy coordinator approval APIs still require their existing memberships and do
not grant privileges to the new organizer endpoints. New organizers need no such
approval. Only the retained organizer endpoints drive the product UI.

## Verification

Required checks include self-service manual/verified Google organizer signup,
unsupported-role rejection, transactional failure/duplicate signup, active account
and cross-owner denial, CSRF for event/profile mutations, direct publication,
stale metadata edits, disabled/booking-linked edit rejection, immutable V1–V5,
MySQL V6/V7 migration compatibility, frontend role choices/routes and isolated
runtime journeys. No real Google token provider or participant email is used in
automation.

Local verification on 2026-11-17:
- `mvn -B -ntp -f backend/pom.xml verify`: 108 tests, zero failures/errors,
  including disposable MySQL 8.4 migration/backfill, transactional registration,
  authorization, stale edits, CSRF and preservation of existing bookings.
- Frontend frozen Bun install, 99 tests across 18 files, typecheck, lint and
  isolated production build passed; no dependency or lockfile changes.
- Existing infrastructure/security checks passed: configuration validation,
  42 deployment-policy tests, workflow/shell/Docker analysis, Gitleaks, Semgrep
  (zero findings), Trivy infrastructure checks and frontend dependency scans
  (zero vulnerabilities). Trivy used its authoritative GHCR database mirror
  locally; committed gates and thresholds were unchanged. Current backend and
  frontend source trees also passed Gitleaks directory scans.
- Browser/runtime check: `python3 frontend/scripts/organizer-smoke.py` reuses
  the existing disposable MySQL/Redis harness, launches an isolated Next.js and
  Chromium, and keeps campaigns/email dispatch disabled. Passed organizer login, direct
  creation/publication/public detail, attendee control restrictions and retired
  admin UI. Existing harness checks also passed session/CSRF protection, login
  throttling, cache isolation, HTTP 429, Redis outage/recovery and failed-migration
  startup denial. Disposable services were removed; shared databases untouched.

No Azure deployment, live Google/ACS provider validation, new container image
publication or full image vulnerability scan was performed. Before shared
rollout, review target Flyway histories and the deliberate removal of moderation.
The incoming organizer UI implements listing creation/editing, discovery and saved
items; checkout, QR issuance, sales metrics and attendee email are separate work.
Legacy protected administration APIs remain available to existing authorized
operators until a separately reviewed retirement.
