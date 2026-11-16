# Coordinator workspace contract

Open `/coordinator` or any Create Event link. The browser checks server eligibility;
guests return here after login. Organization access is independent for each
organization under the same login. Workspace selection is UI state; every server
operation validates the active account, approved membership and event creator.
Global ORGANIZER/ADMIN/CONTRIBUTOR roles alone confer no organization access.
Ordinary user mode remains `/profile`; administrators use the existing secure
same-account switch before applying or coordinating.

## Dashboard presentation

The coordinator workspace follows the existing admin template: a black GoEvent
sidebar, condensed display headings, neutral cards, pill buttons and small red
accents. Overview offers all-event or individual-event statistics, current event-state
counts, recorded bookings, booked ticket quantities and impressions. Recorded
payments are visible by default; secondary package details expand on demand. The sidebar keeps organization switching,
organization access, events and participant email together, with a profile button that opens Switch to user and Log out actions below. On mobile the sidebar opens from a menu button and
closes with Escape, returning keyboard focus. The public navbar is hidden only
inside the workspace. No sample totals, artificial trends or chart data are shown.

## Applications and private proof

Existing organizations or proposed name/type are accepted with committee position,
contact email/phone, explanation and a private authorization letter. PDF, JPEG and
PNG content/MIME are checked, at most 10 MiB. Documents are database BLOBs with type,
size and digest metadata, served as no-store attachments only to the applicant or
an active dedicated administrator. They never enter public image storage. Review
storage capacity and retention before rollout; do not export production proofs as
test fixtures. PDF checks identify the signature/end marker, not a malware scan;
review downloaded proof in a sandboxed viewer. No document body is logged.

Pending applications are unique per account and existing organization or normalized
proposal name. An administrator links a proposed organization to an existing one
or explicitly confirms creation. Rejection preserves ordinary access and allows
resubmission. Approved request revocation is recorded with `revoked_at` while the
original approval decision remains intact. Membership history preserves all rows.
The V5 backfill activates only each active legacy coordinator's latest assignment,
ordered by registered_date then ID descending, matching the old current-assignment
rule. Older organization links remain revoked. Coordinators can apply to those
organizations again; a new administrator approval is required to restore access.
Historical approval decisions do not themselves grant current access; the dashboard
checks approved memberships when displaying access history.
Membership-specific revocation affects one organization; the legacy account-wide
revoke endpoint explicitly revokes every organization and restores the recorded
previous USER/STUDENT role. Disabling an account affects all modes immediately.

## Event lifecycle and configuration

Save draft → submit frozen revision → admin approve/reject. Rejected content can
be corrected by saving a new revision and resubmitting. Approval publishes exactly
the reviewed snapshot. Proposed edits to approved events leave the current version
public. Every mutation/review requires the current `event.revision`; stale requests
return 409. Review detail includes the full submitted configuration and private
approval document download. Admin direct edits cannot bypass this workflow.

Content includes description/category, venue, IANA timezone, explicit UTC start/end,
cover/banner URLs, HTTPS video link, private approval document, confirmation message,
currency, up to three packages and audience/booking settings. Free packages cost
zero; paid packages have positive DECIMAL inputs with at most two fractional digits.
Universities, package eligibility, minimum age, per-user limit and intended QR use
are persisted configuration. No checkout, reservation, payment, QR issuance or
check-in enforcement is claimed. Existing ticket/booking/payment records remain
untouched; new revision package configuration is not a second inventory ledger.

Only unpublished drafts with no submission/dependent history can be deleted.
Otherwise cancel with a reason; keep financial/booking records and queue a notice.
Approved rescheduling and the corresponding participant notice commit together.
Cancellation never automatically refunds. Legacy approved events retain their
public rows while a first replacement revision is reviewed. Ambiguous organization
ownership stays NULL until an audited admin assignment; no ownership is guessed.

## API

Prefix `/goevent/api/coordinator`, ordinary session `userId` and active account.
Fetch `/csrf` and send the returned header/token for every mutation. Session
switch/login rotates tokens. Failures are 400 invalid input, 401 login required,
403 ownership/membership/CSRF denial, 404 missing, 409 stale/restricted transition,
503 database unavailable. Lists use zero-based page and size 1–100 (default 25).

| Method | Suffix | Purpose |
| --- | --- | --- |
| GET | `/eligibility`, `/workspaces` | Approved organization memberships |
| GET | `/catalog` | Database reference IDs for forms |
| GET/POST | `/applications` | Own history / complete application |
| POST | `/documents?purpose=AUTHORIZATION\|EVENT` | Multipart `file` private proof |
| GET | `/documents/{id}` | Owner/admin-only attachment |
| POST | `/images?kind=event\|banner` | Approved member multipart public image |
| GET | `/workspaces/{org}/statistics?from=...&to=...&eventId=...` | UTC inclusive/exclusive report; eventId optional |
| GET/POST | `/workspaces/{org}/events` | Owned paginated/filterable events / draft |
| GET/PUT | `/workspaces/{org}/events/{id}` | Detail / `{revision,content}` |
| POST | `/workspaces/{org}/events/{id}/submit` | `{revision}` |
| POST | `/workspaces/{org}/events/{id}/cancel` | `{revision,reason}` |
| DELETE | `/workspaces/{org}/events/{id}` | `{revision,reason}` draft only |
| GET | `/workspaces/{org}/events/{id}/attendees.csv` | Authorized CSV; maximum 10,000 bookings |
| GET/POST | `/workspaces/{org}/events/{id}/campaigns` | Campaign states / confirmed message |
| POST | `/workspaces/{org}/events/{id}/campaigns/{campaign}/cancel` | Cancel before dispatch |

Application body: `organizationId` or `proposedName,proposedTypeId`, plus `position,
contactEmail,contactPhone,explanation,proofId`. Legacy `/coordinator-requests` accepts
these additive fields with `message` for explanation; incomplete applications are
rejected rather than approved without proof.

Admin additions under `/goevent/api/admin`: GET `/accounts/{id}/memberships`, POST
`/memberships/{id}/revoke` with reason; POST `/coordinator-applications/{id}/decision`
with `approve,reason,organizationId,createOrganization`; GET `/event-revisions/{id}`;
GET `/private-documents/{id}`; POST `/events/{id}/organization` with organizationId
and reason for unassigned legacy events. Existing event decision route reviews the
frozen working revision using the current event version, including replacements.

Public GET `/goevent/api/public-events` and `/{id}` expose approved active events.
`/{id}/impressions` POST requires the token from `/public-events/csrf`. Server-side
session/event deduplication uses a rolling 30-minute window. Counts begin at rollout;
no historic views are fabricated. Private proof IDs are removed from public content.

## Reports, CSV and email

Overview UTC ranges are inclusive start, exclusive end. An optional eventId limits
all aggregates to one creator-owned event in the selected approved organization;
omitting it keeps the workspace-wide report. Other owners/organizations and revoked
memberships are rejected. Current event-status counts are snapshots, not date-range
activity. Historical pending/rejected rows without a revision use their recorded
review state. Booked ticket quantity is distinct from confirmed paid sales. Event filters use approved
schedule, retaining drafts without a schedule. Upcoming/ongoing/completed derive
only from approved times. Impressions, bookings and recorded package quantities
are measured; invalid legacy string amounts/quantities are counted separately.
Successful-payment amounts and refunded-state amounts are separate, grouped by
explicit currency; NULL currency remains UNKNOWN. The existing payment status
is not a refund ledger, so net recorded/reconciled revenue is unavailable. Historic
bookings with unknown dates and pre-rollout impressions are explicitly unavailable.
CSV uses quoted/escaped cells with formula-leading values neutralized; no payment
credentials or QR secrets are exported. Large exports require a future streaming
export job rather than an unbounded synchronous response.

Campaign body: `subject,message,scheduledLocal,confirm`. Message is plain text;
`confirm=true` is mandatory. Blank schedule means immediate. Wall time uses the
approved event IANA timezone; the server rejects DST gaps/overlaps and stores UTC.
Campaigns target distinct registered booking users, not unrelated organization
members. Registration is a recorded booking; the present schema has no booking
status/participant opt-out ledger. This definition is displayed in the UI and must
be reviewed when real booking cancellation/consent is implemented.

`COORDINATOR_ENABLED=false` disables coordinator entry points while preserving
published public events, audit and membership records.
`COORDINATOR_CAMPAIGNS_ENABLED=false` disables dispatch and campaign outbox claims,
independently of `ACS_EMAIL_ENABLED`. After review enable both to send. Membership,
creator ownership and account activity are rechecked before starting each custom
campaign batch. System cancellation/reschedule notices remain durable despite
membership revocation. Workers expand at most 100 recipients per transaction with
one outbox row per campaign/user; cursor progress and inserts commit together.
Delivery reuses ACS and its 10-minute leases, five attempts and stale-attempt guard,
outside transactions. A campaign cancelled before dispatch sends nothing; started
campaigns cannot be recalled. QUEUED is persisted, ACCEPTED is ACS acceptance, FAILED
is retry exhaustion. Ambiguous provider timeout/process death may cause duplicates;
these states do not claim inbox delivery.

See [impact and rollout](../decisions/0005-coordinator-workflows.md) for migration,
verification and rollback boundaries. Never enable ACS during automated tests.
