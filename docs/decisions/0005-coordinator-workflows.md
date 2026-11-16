# Coordinator workspaces and reviewed publication

Status: implemented locally; rollout requires review. Branch: `vinura/coordinator-dashboard`.

## Baseline and blast radius

Read-only inspection of local MySQL on 2026-11-15 found successful Flyway V1–V4,
with columns and constraints consistent with the migrations. No local events,
requests or organization assignments exist. No local application data was changed.
README/architecture claims that Security and Java tests are absent lag source:
Security, Redis sessions, admin moderation, ACS and Java tests already exist.

High risk: authentication/CSRF, admin decisions and revocation, public event
visibility, organization ownership, private proof, schema evolution and email.
Keep existing role IDs, JDBC layers, session identities, gateway prefix and ACS
adapter. Global role is not organization authorization. Extend existing membership
and request tables; preserve historical assignments. Backfill access only to the latest assignment for each
active role-2 user (registered_date DESC, id DESC, matching V4); assign events only from one distinct recorded organization.
Unassigned legacy events require audited administrator assignment before mutation.

Revisions freeze complete event content. Admin approval replaces published content
atomically; edits never overwrite the previous approved revision. All writes use
the existing database mutex and revision checks, including admin paths. This
serializes relatively infrequent workflow writes; replace with consistently
ordered resource locks if observed throughput warrants it. Existing bookings,
payments, issued tickets and legacy ticket catalog remain intact. New packages
are configuration, not implemented inventory or checkout. No refunds are inferred.

Private documents live in an access-controlled database table, never public image
storage. Authorization is rechecked on download. Campaign recipients come only
from event bookings, with one durable outbox record per campaign/recipient.
Scheduling uses event-local wall time converted by the server to UTC. Delivery
uses the existing leased/retrying ACS adapter outside transactions; ACCEPTED means
provider acceptance, not inbox delivery. Ambiguous provider failures can duplicate
messages. Campaigns default disabled independently of administrative email.

## Compatibility and rollout

V1–V4 are immutable. V5 is additive except replacement of pending-request
uniqueness with per-organization/proposal uniqueness. Existing unverified requests
need proof before approval. Keep legacy admin routes with additive fields; new
membership-specific revocation does not disable the account. Legacy all-access
revocation explicitly revokes all memberships. Public listing reads approved
revisions; legacy approved rows remain visible without inventing missing options.

Do not apply V5 to the shared/local development database as part of tests. Test
migration/backfill against disposable MySQL. Roll out with coordinator entry points
and campaigns disabled until configuration, proof retention/storage capacity and
schema deployment are reviewed. Application rollback disables entry points and
campaigns; retain migrated data, decisions, audit and email records. MySQL DDL is
not fully transactional: review backup/restore and locks before shared rollout.

Verification evidence, the complete file inventory and remaining limitations are in
[coordinator validation](../architecture/coordinator-validation.md).

## Edge routing and date compatibility

Coordinator and admin workflow APIs have an explicit no-cache gateway route with
10 requests/second and a burst of 30, permitting CSRF/session negotiation plus
parallel dashboard reads. The existing Redis per-account/per-peer administrator
login throttle remains enforced; public/default and diagnostic routes keep their
limits. The old burst of five rejected the sixth request in a valid admin login
sequence. Private proof and authenticated data never enter shared response caches.
Coordinator dates bind as UTC LocalDateTime values to MySQL DATETIME, avoiding
machine-timezone conversion from JDBC Timestamp. Event-local scheduling rejects
DST gaps and overlaps. Typed repository methods own SQL; services own validation,
organization/creator checks, review decisions and transaction boundaries.

## Confirmed legacy access and dashboard presentation

The owner confirmed latest-assignment-only migration on 2026-11-15. Retain older
assignment rows as REVOKED. An active coordinator may apply to an older
organization, but access returns only after a new administrator approval. The
existing event-organization ambiguity rule is unchanged: multiple recorded
organizations still require administrator assignment rather than a guess.
V5 was unapplied during the initial implementation. During the account/statistics
follow-up, read-only inspection found V1–V5 applied and one event in the local
database. This follow-up makes no schema or shared-data writes, and leaves V5
unchanged. Any subsequent schema change must use a new forward migration.

The coordinator frontend follows the existing admin layout: a black brand/sidebar,
condensed headings, neutral surfaces, pill controls and restrained red accents.
Reuse the admin stylesheet without modifying its rules, and scope coordinator
layout additions separately. Hide the public navbar only within this workspace;
retain personal account/public event links and an accessible mobile menu.
Existing APIs, ownership/revision checks, event forms and campaign delivery
semantics stay intact. Verify organization switching, reapplication and mobile
navigation alongside the full review/publication browser journey.

## Coordinator account actions and event statistics follow-up

The account footer now uses the same accessible account menu as administration,
with a coordinator label and ordinary-user/profile navigation. Reuse the existing
logout handler; no role, membership or server session-switch contract changes.
Remove the sidebar organization-approval sentence as requested.

Overview adds an optional owned-event filter to the existing statistics contract,
plus current event-state counts and recorded ticket quantities. Preserve the
unfiltered organization report and UTC inclusive/exclusive ranges. Validate
membership and creator ownership before event-specific reads, and retain both
predicates in every aggregate query. Show currencies separately and keep missing
financial history unavailable. No schema, inventory, payment or delivery writes
are required. Regression checks cover cross-owner/cross-organization denial,
range boundaries, event switching, menu dismissal/focus, user-mode navigation and
logout; existing administrator menu behavior must remain intact.
