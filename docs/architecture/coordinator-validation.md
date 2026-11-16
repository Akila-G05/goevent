# Coordinator implementation handoff

Branch: `vinura/coordinator-dashboard`. This handoff records the complete implementation, validation evidence and rollout limits. Commit/push and pull-request publication were authorized on 2026-11-16; deployment remains outside this task.

## Confirmed migration policy

The owner confirmed latest-assignment-only backfill. V5 follows the existing
`registered_date DESC, id DESC` ordering for each active legacy coordinator.
Older rows remain revoked; requesting an older organization uses the same private
proof and administrator approval workflow. Tests verify that a pending application
does not grant access and that approval preserves the existing current membership.
The local database remained at V4 during the initial implementation. Latest
read-only inspection during the account/statistics follow-up found successful
V1–V5 and one existing event. This follow-up changes neither shared schema nor
shared data and does not modify the applied V5 migration.

## Complete change inventory

- `.env.example` — Document coordinator entry-point and campaign rollout switches.
- `.gitignore` — Ignore disposable runtime credentials, browser profiles and screenshots.
- `README.md` — Link the coordinator workflow and migration operating contract.
- `backend/src/main/java/com/goevent/config/AdminSecurityConfig.java` — Extend fresh database-backed session checks and CSRF to coordinator/public routes; stable security errors.
- `backend/src/main/java/com/goevent/controller/AdminWorkflowExceptionHandler.java` — Return bounded, stable errors for new workflow controllers and malformed inputs/uploads.
- `backend/src/main/java/com/goevent/controller/CoordinatorAdminController.java` — Expose protected membership decisions, revision/proof inspection and legacy assignment.
- `backend/src/main/java/com/goevent/controller/CoordinatorController.java` — Expose authenticated, CSRF-protected coordinator transport, proof and CSV endpoints.
- `backend/src/main/java/com/goevent/controller/PublicEventController.java` — Expose approved publication reads and CSRF-protected impression recording.
- `backend/src/main/java/com/goevent/dto/AdminRequests.java` — Add proof/contact/proposal fields to the existing coordinator request contract.
- `backend/src/main/java/com/goevent/dto/CoordinatorRequests.java` — Define bounded typed application, revision, package, campaign and ownership-assignment inputs.
- `backend/src/main/java/com/goevent/repository/AdminEmailRepository.java` — Hold participant mail when campaigns/entry points are disabled; preserve leased delivery and attempts.
- `backend/src/main/java/com/goevent/repository/AdminRepository.java` — Grant/revoke organization memberships while retaining history; expose proposal and revision state to admin.
- `backend/src/main/java/com/goevent/repository/CoordinatorRepository.java` — Own typed coordinator/publication/report/export SQL, including ownership-scoped event filtering, status snapshots, ticket quantities, currencies and date-bounded aggregates.
- `backend/src/main/java/com/goevent/repository/ParticipantCampaignRepository.java` — Expand recipients in bounded transactional batches with cursor progress and uniqueness.
- `backend/src/main/java/com/goevent/service/AdminManagementService.java` — Route existing reviews/cancellations through coordinator rules; prevent direct publication bypass.
- `backend/src/main/java/com/goevent/service/CoordinatorService.java` — Enforce memberships and creator ownership for operations and individual-event statistics, revision transitions, document validation, CSV escaping and campaign rules.
- `backend/src/main/java/com/goevent/service/ParticipantCampaignWorker.java` — Schedule bounded dispatch only when coordinator campaigns are explicitly enabled.
- `backend/src/main/java/com/goevent/service/PublicEventService.java` — Read approved active publication snapshots and deduplicate session impressions.
- `backend/src/main/resources/application.yml` — Configure independent entry-point/campaign switches with campaigns disabled by default.
- `backend/src/main/resources/db/migration/V5__coordinator_workspaces.sql` — Forward-only schema, latest-assignment-only membership backfill, conservative event ownership, private proof, immutable revisions, impressions and campaigns.
- `backend/src/test/java/com/goevent/config/AdminSecurityConfigTest.java` — Regression coverage for the affected workflow, security boundary or frontend behavior.
- `backend/src/test/java/com/goevent/service/AdminWorkflowsIntegrationTest.java` — Regression coverage for the affected workflow, security boundary or frontend behavior.
- `backend/src/test/java/com/goevent/service/CoordinatorWorkflowsIntegrationTest.java` — Regression coverage for the affected workflow, security boundary or frontend behavior.
- `docs/images/coordinator/overview.png` — Capture the real coordinator overview and event statistics using isolated test fixtures for PR review.
- `docs/images/coordinator/account-menu.png` — Capture the working account popup and its two actions for PR review.
- `docs/images/coordinator/mobile.png` — Capture responsive coordinator overview layout for PR review.
- `docs/architecture/coordinator-validation.md` — Record complete local change inventory, actual verification and outstanding rollout limits.
- `docs/architecture/coordinator-workflows.md` — Document endpoints, lifecycle, data/financial limits, email states and rollout switches.
- `docs/decisions/0005-coordinator-workflows.md` — Record live read-only baseline, blast radius, compatibility and rollback approach.
- `frontend/src/api/admin.ts` — Add a typed membership list client for organization-specific admin revocation.
- `frontend/src/api/coordinator.ts` — Type coordinator contracts including selected-event/statistics fields, uploads/exports and event-timezone conversion with DST ambiguity checks.
- `frontend/src/app/coordinator/page.tsx` — Compose the connected coordinator feature view using the App Router.
- `frontend/src/app/events/[id]/page.tsx` — Show the approved snapshot, banner, schedule/packages and record impressions without exposing proof.
- `frontend/src/app/events/page.tsx` — List only approved active events from the backend with pagination.
- `frontend/src/app/login/page.tsx` — Preserve the supported coordinator return destination for ordinary/password/Google login.
- `frontend/src/app/profile/page.tsx` — Route creation through eligibility and replace fabricated organizer/scanner metrics with the real workspace entry.
- `frontend/src/components/admin/coordinator-review.tsx` — Inspect private proof/revisions, resolve organization proposals, revoke one membership and assign ambiguous legacy events.
- `frontend/src/components/admin/account-menu.tsx` — Keep the administrator contract and callbacks while delegating presentation/keyboard handling to the shared account popup.
- `frontend/src/components/shared/account-menu.tsx` — Reuse the admin popup for coordinator identity, Switch to user and Log out, including outside-click dismissal and nested Escape/focus handling.
- `frontend/src/components/admin/dashboard.tsx` — Connect proposal review, private revision inspection, membership revocation and legacy ownership assignment.
- `frontend/src/components/admin/forms.tsx` — Clarify that account edits preserve existing memberships unless a grant is requested.
- `frontend/src/components/coordinator/coordinator.css` — Scope the admin-inspired coordinator layout, responsive sidebar, typography, cards and focus states.
- `frontend/src/components/coordinator/overview.tsx` — Render all-event/individual-event totals, current event-status counts, booked quantities, recent events and recorded payments without synthetic statistics.
- `frontend/src/components/coordinator/workspace-shell.tsx` — Reuse the admin template for navigation/organization switching and the shared account popup; remove the requested sidebar sentence and preserve accessible mobile navigation.
- `frontend/src/components/coordinator/dashboard.tsx` — Compose the admin-inspired workspace around organization switching, paginated views, recorded reports, draft revisions and participant actions.
- `frontend/src/components/coordinator/forms.tsx` — Provide application inputs including older organizations, expandable report tables, date controls and shared admin styling.
- `frontend/src/components/events/create-event-modal.tsx` — Connect the existing form to draft saves, validated reference data, image previews, private proof and event/package options.
- `frontend/src/components/shared/navbar.tsx` — Route creation through eligibility, link approved public events and hide the public navbar inside the coordinator/admin shells.
- `frontend/src/lib/session-store.ts` — Remove global-role eligibility as a source of coordinator authority.
- `frontend/src/test/coordinator-dashboard.test.tsx` — Regression coverage for the affected workflow, security boundary or frontend behavior.
- `frontend/src/test/create-event-modal.test.tsx` — Regression coverage for the affected workflow, security boundary or frontend behavior.
- `frontend/src/test/session-store.test.ts` — Regression coverage for the affected workflow, security boundary or frontend behavior.
- `gateway/src/main/resources/application.yml` — Add uncached workflow routing with capacity for CSRF/session negotiation; retain login throttling.
- `infra/ci/admin_postman_smoke.py` — Seed private proof, approved memberships and a frozen revision only in disposable MySQL.
- `infra/ci/coordinator_browser_smoke.py` — Run Postman, real frontend and Chromium in isolated service/source directories.
- `infra/ci/runtime_smoke.py` — Allow exact isolated-test environment overrides and explicitly disable campaign delivery.
- `infra/tests/coordinator-browser.mjs` — Exercise application, admin approval, draft/review/publication, organization switching, CSV and mobile layout.
- `infra/tests/postman/admin.postman_collection.json` — Cover additive proof fields and rejection of direct edits that bypass frozen review.

## Review screenshots

Captured against disposable services with test fixtures:

- [Desktop overview](../images/coordinator/overview.png)
- [Account popup](../images/coordinator/account-menu.png)
- [Mobile overview](../images/coordinator/mobile.png)

## Verification

Verified locally on 2026-11-15:

| Check | Actual result |
| --- | --- |
| `mvn -B -ntp -f backend/pom.xml verify org.springframework.boot:spring-boot-maven-plugin:4.0.9:repackage` | Passed; 62 tests, zero failures/errors/skips, including disposable MySQL migration/workflow tests |
| `mvn -B -ntp -f gateway/pom.xml verify org.springframework.boot:spring-boot-maven-plugin:4.0.9:repackage` | Passed; 2 tests |
| `bun install --frozen-lockfile` | Passed without dependency or lockfile changes |
| `bun run test` | Passed; 87 tests across 13 files |
| `bun run typecheck` | Passed |
| `bun run lint` | Passed without ESLint warnings/errors; Next reports its existing lint-command deprecation |
| `bun run build` | Passed in a clean temporary frontend copy with shared installed dependencies; avoids interference from the running development server's `.next` |
| `python3 infra/ci/coordinator_browser_smoke.py` | Passed; 73 Postman requests / 82 assertions, full real-browser coordinator journey, plus the isolated runtime smoke |
| `git diff --check` | Passed |

Backend coverage includes per-organization applications/proposals, private document validation/ownership, scoped revocation, duplicate/repeated decisions, frozen revisions, approved replacement/reschedule/cancellation, stale/concurrent reviews, CSV formula escaping, eligibility configuration, UTC boundaries, deduplicated impressions, preserved booking/payment rows, historical backfills, bounded concurrent recipient expansion, cancellation, disabled dispatch, fake-adapter acceptance and retry exhaustion. Existing lease/attempt fencing and authentication/session/CSRF suites remain passing.

The real browser exercised guest return/login, private proof application, admin proof review, workspace draft submission, exact-revision approval/public display, organization switching and cross-scope denial, authorized CSV and mobile rendering. Runtime smoke also verified public-cache boundaries, HTTP 429, Redis outage/recovery and failed-migration startup denial. ACS and campaign dispatch were disabled; no real email was sent. Screenshots/logs are local ignored artifacts under `infra/validation/coordinator-ui/`. These local checks do not prove GitHub CI, deployment or real ACS delivery.

The existing local MySQL instance was inspected read-only before/after work and retained successful V1–V4 with zero events/organization assignments during the initial work. The later account/statistics follow-up found V5 already applied and one event. Tests use disposable MySQL 8.4 and authenticated Redis, not the shared Compose database.

## Remaining rollout limits

- Latest-assignment-only access is confirmed. V1–V5 are now applied locally and must remain immutable there; any future schema change requires a new forward migration and reviewed rollout/recovery.
- Review proof storage capacity/retention and untrusted PDF handling. PDF signature/end-marker checks identify type; they do not provide malware scanning.
- Campaigns stay disabled until configuration review. ACS connection-string/Managed Identity construction is covered by existing tests; real provider delivery and deployment identity/RBAC remain unverified.
- Existing payment status records cannot reconstruct an independent refund ledger or reconciled net revenue. Unknown data stays unavailable; package configuration is not checkout inventory.
- CSV is bounded to 10,000 bookings. Started campaigns cannot be recalled; ambiguous provider failures can duplicate email.

## Latest-assignment and theme follow-up

The confirmed migration change is high risk for access grants and is covered by
MySQL upgrade/reapproval tests, including date-versus-ID ordering, NULL date ties,
suspended accounts and ordinary users with historical links. Older organizations
remain available in the application form, outside approved workspace selection.
The frontend change reuses admin CSS without changing admin rules or API contracts.
Additional frontend tests cover the shell, collapsed reports, historical
reapplication choices and Escape/focus behavior. The isolated browser journey
checks mobile navigation, viewport overflow and real reapplication to revoked
access. Follow-up verification passed: the full backend build (61 tests), 82 frontend
tests, TypeScript, ESLint and an isolated production build. The Postman collection
(73 requests / 82 assertions) and complete isolated browser/runtime smoke passed,
including reapplication to revoked organization access, organization switching,
mobile menu Escape/focus behavior and no horizontal viewport overflow. Desktop,
mobile and open-menu screenshots were inspected in Chromium. No real participant
email was sent, and no shared schema/data or Git publication was changed.

## Profile popup and event-specific overview follow-up

The profile button now shares the administrator account popup while retaining
coordinator-specific callbacks: Switch to user navigates to the same personal
profile; Log out uses the existing confirmed server logout. Menu actions remain
inside the popup, with keyboard arrows, outside-click dismissal and Escape focus
restoration. Escape closes the popup before a containing mobile navigation drawer.
The requested organization-approval sidebar sentence and its unused styles are
removed.

Overview supports individual owned events or the full selected organization.
Statistics include current event-state counts, recorded bookings, booked ticket
quantities, impressions and payment amounts by currency. Payment details start
expanded; net/refund-ledger limitations remain explicit. Existing default report
parameters and API consumers remain compatible; no migration is added. Legacy
pending/rejected events without revisions retain their actual recorded review
state. The service validates event ownership plus current membership, and every
aggregate retains the owner/organization/event filters.

Validation: full backend verify/repackage passed (62 tests); frontend tests passed
(87), as did TypeScript, ESLint and an isolated production build. Postman (73
requests/82 assertions) and the isolated browser/runtime smoke passed, including
real profile popup actions, same-identity user navigation, logout invalidation,
per-event overview selection, cross-organization report denial, mobile nested
Escape/focus behavior and viewport checks. MySQL regression coverage includes
multiple owners/organizations, invalid quantities/amounts, date boundaries,
revocation, unclassified history and legacy event states. No shared-data write,
real email, commit, push or PR was performed during that earlier validation.

## Publication verification — 2026-11-16

Fresh publication gates passed: backend verify/repackage (62 tests), gateway
verify (2 tests), frozen Bun install, frontend tests (87), typecheck, lint and
an isolated production build. The full isolated browser/runtime smoke passed,
including Postman (73 requests, 82 assertions), organization authorization,
profile actions, public publication, migration failure and Redis recovery.
Disposable infrastructure was removed; the existing database was untouched and
no real participant emails were sent. Three curated screenshots contain only
isolated test fixture data. Commit, feature-branch push and PR publication are
authorized; deployment and real email enablement remain outside this task.
