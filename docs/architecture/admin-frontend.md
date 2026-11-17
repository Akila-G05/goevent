# Admin frontend

> Historical UI/workflow reference. Public admin/coordinator dashboards are retired.
> Current self-service organizer behavior is defined by [ADR 0006](../decisions/0006-organizer-self-service-integration.md).
> Legacy backend contracts and historical records remain protected for compatibility.

The App Router `/admin` workspace uses the existing GoEvent fonts, light surfaces,
black controls and muted chart accents. The reference image informs its sidebar,
card grid and toolbar. All live statistics come from the existing backend; there
are no fabricated trends, growth rates or reconciled-revenue claims.

The visual polish follows the original home page: GoEvent's slash wordmark,
condensed Bebas headings, a black brand rail, restrained neutral charts, pill
controls and thin card borders. Red is a small accent. Styling stays within
admin CSS, branding markup and chart colours; API calls, permissions and working
mode transitions are unchanged. Desktop, mobile and account-list previews were
inspected; the 67 frontend tests, TypeScript and lint checks passed (existing
profile-image warnings remain). No backend/database changes are part of this
visual pass.

The overview's initial view is limited to four key totals, community composition
and event review status. Secondary statistics are grouped into collapsed native
disclosures: Event schedule, Payments & tickets, and Community & requests.
Financial limitations appear with the financial report, before its figures;
unknown-history and invalid-value information remains available in its related
report. This organization changes presentation only, not API queries or numbers.

The bottom sidebar account button shows the signed-in name (email fallback).
Its upward-opening dropdown contains Switch to user and Log out, supports
keyboard arrows/Escape/Tab and outside-click dismissal, and replaces standalone
footer actions. The protected session response supplies only the current
account's display identity; authorization and mode switching are unchanged.
Verification: 70 frontend tests, 47 backend tests, TypeScript and lint passed;
the dropdown was inspected in Chromium. Restart the backend after updating to
receive the new session name/email fields. No schema/database changes are needed.

## Open and test

Start dependencies, backend and gateway according to
[local development](../../infra/docs/LOCAL-DEVELOPMENT.md), then run
`bun run dev` inside `frontend/`. Open `http://localhost:3000/login` and use an
existing active password administrator. Ordinary password login detects ADMIN,
then obtains CSRF and establishes/verifies the dedicated admin session before
redirecting to `/admin`. No default administrator is provided. Google sign-in
also opens `/admin` for an existing active database administrator after server
token verification and subject lookup. The browser verifies the dedicated admin
session before redirecting; ordinary Google users retain ordinary sessions.
An old ordinary Google session must sign out and sign in again after upgrading.

For a read-only design preview without backend access, open
`http://localhost:3000/admin/preview` in development. Fictional sample data is
prominently labelled, the preview makes no API requests, and writes are disabled.
The preview route returns not-found in production. Screenshots are generated
locally under ignored `infra/validation/admin-ui/`, not committed as source.

Admin authentication replaces an ordinary session. The sidebar's **Switch to
user** control rotates to an ordinary session for the same account, opens
`/profile` in user mode and removes admin API access. **Back to admin** on that
profile rotates back after fresh server-side role/status verification. No other
account can be selected; this is not impersonation and does not change the
database role. Ordinary login still replaces any earlier session, removing
elevated attributes and preventing session fixation.

## Functional coverage

- Overview: overall/individual statistics, Colombo date bounds, account/event
  charts, currency-separated payments, ticket/booking/request breakdowns and
  explicit limitations for unknown historic data.
- Accounts: role/access/search filters, bounded pagination, create/edit forms,
  organization lookup, disable/reactivate, coordinator revocation and guarded
  permanent deletion. No passwords are included in account edits.
- Coordinator requests: details, pending/approved/rejected filters and reasoned
  approval/rejection. Ordinary-user application UI remains a separate feature.
- Events: review-state and schedule filters, fresh detail/revision lookup, edits,
  approval/rejection, disable and guarded deletion; no invented re-enable API.
- Messages: inbox/details and single reply, accurately reported as queued.
- Audit: read-only history. Email delivery: metadata and reasoned FAILED retries.
  ACCEPTED does not mean delivered; ACS remains disabled until externally verified.

All mutation dialogs require explicit submission and reasons where applicable.
Forms use installed React Hook Form/Zod, dialogs contain keyboard focus and
restore focus on close, and tables/charts have textual equivalents. Dates are
interpreted in Asia/Colombo; the selected through-date is inclusive. Amounts are
displayed as supplied by the server, without client-side financial aggregation.

## Security and failure behavior

The backend remains authoritative. Route checks verify the dedicated session;
ordinary user roles in browser state do not authorize admin requests. Session
errors are distinguished from network outages. Cookies remain browser-managed;
passwords and CSRF tokens are not persisted to browser storage.

Admin queries have a separate cache namespace; authentication transitions clear
private data. Mutations obtain fresh CSRF tokens and are never automatically
replayed. Conflicts refresh server data and require explicit retry. Stale event
revisions, linked deletion restrictions, last-admin protection, revoked access,
rate limits and service outages remain server-enforced. Failure to log out does
not claim success. The client periodically rechecks active admin authorization.

## Blast radius and rollback

Google-admin integration additionally touches the shared Google button and the
profile Admin entry. The old visual Admin role toggle is replaced with a real
dashboard link shown only for an actual admin role. An active existing database
admin can establish the dedicated session after verified Google login without
adding a password. Public signup cannot select ADMIN; client-decoded Google
claims and role switches never grant access. Token signature, audience and
verified-email checks remain mandatory, and admin APIs still recheck current
database role/status on every request. No database permission/account changes
are performed by this integration. Roll back its backend and frontend changes
together if reverting Google-admin entry.

Most implementation lives in new admin API/types, components and routes. Shared
changes affect the ADMIN branch of password login, cache cleanup, hiding the
public navbar only on admin routes, and keyboard focus containment in existing
dialogs. Login forms explicitly use POST to prevent native pre-hydration form
submission from putting credentials in URLs.

A narrow backend change invalidates the previous session before ordinary
manual/Google sign-in creates a new one: this prevents `adminUserId` surviving an
account switch. It intentionally signs out the previous identity; a regression
unit test covers elevated-to-ordinary switching. No database/schema, Azure,
Redis ACL, ACS activation, deployment gate or dependency change is included.
Existing profile dialogs and ordinary login tests must keep passing.

Rollback is a code revert, with no schema rollback required. Existing admin
backend authorization must remain enabled. Do not restore the old session reuse
behavior when reverting UI work.

## Verification commands

```bash
# frontend/
bun run lint
bun run typecheck
bun run test
bun run build

# repository root, Docker + Java 21 + Bun + Node WebSocket support + Chromium + Postman CLI
mvn -f backend/pom.xml verify spring-boot:repackage
mvn -f gateway/pom.xml verify
python3 infra/ci/admin_frontend_smoke.py
```

The browser harness uses the existing disposable Postman/runtime test stack,
launches a temporary local Next dev server and Chromium, and exercises real
shared login, live statistics, account/event screens and logout. Credentials
stay in temporary local files; there is no cloud reporting or real ACS send.
It also runs the full Postman collection and existing failure/recovery smoke.
Do not run destructive collections against shared databases. Stop other Next
processes in this checkout before the harness to avoid `.next` build conflicts.
The harness uses port 3000 to match the existing local CORS allowlist and refuses
to start if that port is occupied. Browser requests may warm public caches; only
response-cache keys in the disposable Redis container are cleared before the
existing cache assertions. Shared Redis and authentication keys are untouched.
External Azure, real email delivery and production-readiness evidence remain
outside these local checks. Nothing is committed or pushed automatically.

## Local validation record (2026-11-15)

- Frontend: 60 tests, TypeScript checking, lint and the final production build
  passed. Lint retains two pre-existing profile-page image warnings. An actual
  production-server request verified the development preview returns HTTP 404.
- Backend: 35 tests passed, including session identity replacement.
- Infrastructure: 32 tests passed; Python and JavaScript syntax checks passed.
- Desktop (1440px) and mobile (390px) Chromium design screenshots were inspected.
- Postman: 73 requests / 82 assertions passed against disposable services.
- Real Chromium browser: shared password login elevated to a verified admin
  session; live overview, account list/create form and event list rendered;
  logout removed access and revisiting `/admin` returned to login.
- The combined runtime harness passed migrations/startup, CSRF/throttling,
  public cache behavior, HTTP 429, Redis outage/recovery and failed migration
  rejection. All disposable services and temporary credentials were removed.
- External Azure/ACS delivery and production deployment were not tested or changed.

## Own-account switching follow-up

Switching uses two additive CSRF-protected auth endpoints. The dedicated admin
session becomes an ordinary session with the same ID and a server-only return
marker. In user mode the profile shows USER view and a Back to admin control;
creator role-preview controls are hidden. Returning checks current active-admin
status again and rotates the session. Both transitions cancel queries and clear
private cache; profile/session queries pause during the transition to prevent
stale authorization responses from overriding navigation. No target account,
password change, role mutation or schema change is supported by the switch.

Verification on 2026-11-15: all 45 backend tests and 67 frontend tests passed;
TypeScript and lint passed with only existing profile image warnings. The
self-switch disposable HTTP harness passed both directions, own profile access,
admin API denial in user mode, ignored caller-supplied target ID and unchanged
stored role. Its 73-request/82-assertion Postman run and full migration/cache/
rate-limit/Redis recovery/failure smoke passed. The new browser test scenario is
provided, but was not run against the user's occupied frontend port in this
follow-up. Existing development services and databases were left untouched.
