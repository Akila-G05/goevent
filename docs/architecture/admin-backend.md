# Admin backend API and operating contract

Base path: `/goevent/api`. No frontend or impersonation feature is included.
Actual checks and remaining blockers are recorded in [validation evidence](admin-backend-validation.md).
See [authentication](admin-authentication.md) for session/CSRF login. All admin
mutations require a CSRF token and an active, dedicated admin session; decisions
and writes recheck the actor inside a transaction after obtaining the shared
admin mutex. Existing user sessions are used only for coordinator requests.

## Endpoints

Responses use `status` and `data` (or a created `id`). Lists are bounded arrays,
ordered by ID, with zero-based `page` and `size` (1–100, default 25). There is no
client-supplied SQL sorting. Errors use appropriate 400/401/403/404/409/429/503
statuses. Changing linked business records is never an implicit cascade.

| Method | Route | Body/filter |
| --- | --- | --- |
| GET | `/admin/accounts` | `role`, `status`, `search`, `page`, `size` |
| GET | `/admin/accounts/{id}` | Safe account fields; no hash/tokens |
| POST | `/admin/accounts` | `firstName,lastName,email,password,roleId,statusId,reason` |
| PUT | `/admin/accounts/{id}` | `firstName,lastName,email,roleId,statusId,reason`; no password change |
| POST | `/admin/accounts/{id}/disable` or `/enable` | `reason` |
| DELETE | `/admin/accounts/{id}` | `reason`; rejects any linked records |
| POST | `/admin/accounts/{id}/revoke-coordinator` | `reason`; prior USER/STUDENT role restored where recorded |
| GET | `/coordinator-requests/csrf` | CSRF for a signed-in ordinary user |
| GET/POST | `/coordinator-requests` | Own history / `organizationId,position,message` |
| GET | `/admin/coordinator-requests` | `status,page,size` |
| POST | `/admin/coordinator-requests/{id}/decision` | `approve,reason` |
| GET | `/admin/events` | `status,phase,page,size` |
| GET | `/admin/events/{id}` | Full event record |
| PUT | `/admin/events/{id}` | `name,description,startsAt,endsAt,revision,reason` |
| POST | `/admin/events/{id}/decision` | `approve,revision,reason`; pending only |
| POST | `/admin/events/{id}/disable` | `reason`; preserves bookings/history |
| DELETE | `/admin/events/{id}` | `reason`; rejects any linked records |
| GET | `/contact/csrf` | Session-bound token for public contact form |
| POST | `/contact` | `email,subject,message`; CSRF and peer throttle required |
| GET | `/admin/contacts` or `/admin/contacts/{id}` | Inbox / full message |
| POST | `/admin/contacts/{id}/reply` | `message`; one reply, queued atomically |
| GET | `/admin/statistics` | Required `from,to`; optional `userId` |
| GET | `/admin/audit` | `page,size` |
| GET | `/admin/emails` | Delivery metadata, excluding bodies/recipients |
| POST | `/admin/emails/{id}/retry` | `reason`; failed notifications only |

## Accounts and coordinator approval

Existing role IDs remain USER=1, ORGANIZER=2, ADMIN=3, STUDENT=4, contributor=5;
account states remain ACTIVE=1, SUSPENDED=2, PENDING=3. New manual accounts need
12-character minimum passwords with a BCrypt maximum of 72 UTF-8 bytes.
No password is emailed.
Admin-created coordinators require `organizationId` and `position` in the account
payload; changing a user into a coordinator requires those fields too. Existing
coordinator membership can be edited with the same fields.

Initial admin provisioning or recovery requires an explicitly authorized
operator process using a securely generated BCrypt hash;
this implementation provides no default credentials or public bootstrap route.

Ordinary active users/students request access to an existing organization.
One pending request is allowed per account. Approval is transactional with
membership, role change, audit and queued email. Repeated/concurrent decisions
conflict. Rejection does not disable the user. Revocation preserves ordinary
access, bookings and membership history.
New coordinator grants record whether the applicant was USER or STUDENT so
revocation restores that role. Older coordinators with no recorded prior role
return to USER; no historical student identity is guessed.
Organization assignments are appended; the latest assignment is current. Profile
editing cannot change the approved organization without admin review, and updates
only the current assignment's position rather than overwriting earlier rows.

New signup requests cannot directly
select organizer/admin/contributor privileges; register normally and use the
request endpoint. Existing frontend role-selection flows need future integration
with that API; no frontend was modified.

Legacy pending ORGANIZER accounts are still listed through account filters.
They are not automatically activated or converted. An admin must explicitly
review and update their status through audited account management. Existing
legacy request rows without organization details cannot be approved until those
details are reconciled; they are not guessed by migration.

Self-deletion, self-disable/demotion and removing the last active admin are
blocked. The shared database mutex serializes rare administrative writes and
decision processing; user-facing reads remain concurrent. Foreign keys are
checked again by MySQL on physical deletion. Audit records keep actor/target IDs
without delete-cascading foreign keys, so deletion cannot erase the audit trail.
Disabling an account is enforced on new admin/coordinator requests and existing
profile/session access; ordinary login also rejects suspended accounts.

## Events and statistics

Review state IDs: PENDING=1, APPROVED=2, REJECTED=3, DRAFT=4. Schedule phase is
independent: ALL, UPCOMING, ONGOING, COMPLETED, UNKNOWN. Start/end inputs must be
explicit ISO-8601 instants, e.g. `2026-12-01T09:00:00+05:30`; display scheduling
in Asia/Colombo. No legacy free-text event time is parsed or invented. Event
edits require the returned revision, valid increasing times and a reason.
Disabling records `disabled_at`; clients must check this flag before offering
an event. This is moderation, not an automatic financial cancellation/refund.

Stats ranges are inclusive `from`, exclusive `to`, UTC instants, at most 10 years.
Current account/event/request groupings are snapshots; registrations, decisions,
bookings, issued tickets and payment records are filtered using their respective
timestamps. Individual stats include bookings made by that user or for events
published by that coordinator. Unknown historic times are counted separately
where available, not falsely attributed to the requested range.

Money is aggregated as DECIMAL and returned without double arithmetic. New
payments default to LKR; legacy currencies remain NULL/UNKNOWN. Invalid string
amounts and quantities are reported explicitly. Booked quantity is not confirmed
paid ticket sales, and a REFUNDED payment state is not a separate refund ledger.
Current payment statuses grouped by creation time cannot reconstruct historical
payment-state transitions or reconciled revenue. Report those limitations to
dashboard consumers rather than presenting fabricated revenue/refund totals.

## Azure Communication Services delivery

`ACS_EMAIL_ENABLED=false` by default. Administrative changes enqueue messages in
MySQL with their transaction. ACS downtime cannot undo approval or make the API
claim delivery succeeded. An enabled worker sends one message per tick outside
the database transaction. Rows are leased for ten minutes, retried with bounded
backoff (five attempts), then marked FAILED for an audited manual retry.

Configure `ACS_EMAIL_ENDPOINT` as your HTTPS Communication Services endpoint,
`ACS_EMAIL_SENDER` as a verified linked-domain sender, and optionally
`ACS_MANAGED_IDENTITY_CLIENT_ID` for a user-assigned identity. The Java SDK uses
managed identity, not connection strings. No Azure resources, DNS, identity or
role assignments are created by this repository change.

The Azure owner must provision/link the Email Communication Services domain,
verify the sender, and grant the chosen identity resource-scoped ACS send access.
Review the current [Microsoft managed identity example](https://learn.microsoft.com/en-us/samples/azure-samples/communication-services-dotnet-quickstarts/email-sample-send-email-with-managed-identity/)
and [Java Email SDK contract](https://learn.microsoft.com/en-us/java/api/com.azure.communication.email.emailclient?view=azure-java-stable)
when selecting least-privilege RBAC. Do not grant subscription-wide Contributor.

The existing deployment design denies container IMDS access. **Do not remove
that guard to enable email.** An operator must approve a compatible restricted
managed-identity integration for the backend before enabling ACS in that
deployment. Until then leave the worker disabled and inspect queued notifications.
Managed identity operation and real ACS sending have not been externally verified.

ACCEPTED means ACS completed its send operation, not inbox delivery. End-to-end
delivery/bounces require provider delivery events, which are outside this first
API. Retry delivery is at-least-once: a process/network failure after provider
acceptance can produce a duplicate message; it cannot repeat the business
decision. No recipient, message body or provider error payload is logged.

## Migration, rollout and rollback

V4 adds workflow/audit/outbox/contact tables, nullable request/event history and
schedule fields, payment currency and an email uniqueness index. V1–V3 are
unchanged. Duplicate existing emails, duplicate pending coordinator requests, or
a conflicting draft lookup ID require operator reconciliation before V4; migration
must stop rather than discard data. Review backup/restore evidence and DDL locks
before any shared rollout. MySQL DDL is not fully transactional. Do not use
automatic clean, baseline or repair on existing databases.

Apply V4 only through an authorized release. No current local or production
database has been migrated by these implementation tests. A Java rollback does
not reverse V4 or administrative decisions; retain the audit and outbox history.
ACS remains disabled during local testing, and tests mock the delivery boundary.
