# Admin API request and testing guide

This is the implemented backend contract, not a frontend dashboard or a deployed
Swagger UI. Read the [endpoint inventory](admin-backend.md) for every route and
the [authentication contract](admin-authentication.md) for session behavior.
Examples use fictional data and IDs: replace IDs with records from your isolated
test database. No example provisions the first administrator.

## Environment and access

Local backend base URL: `http://localhost:8081/goevent/api`.
Local gateway base URL: `http://localhost:8080/goevent/api`.
Use one base URL consistently so cookies and sessions are retained. Production
clients must use the approved HTTPS origin; these local URLs are not deployment
instructions. Follow the [local setup guide](../../infra/docs/LOCAL-DEVELOPMENT.md).

The configured database must have V4. Backend startup applies pending Flyway
migrations: use an isolated database for mutation tests. Keep
`ACS_EMAIL_ENABLED=false` so testing cannot send real email. An authorized operator
must provision an active role-3 account with a BCrypt password before manual admin
login; there is no default password, bootstrap API or password-reset API here.

In Postman, define `baseUrl`, keep its cookie jar enabled, and send JSON bodies
with `Content-Type: application/json`. Do not use Bearer or Basic authentication
for these endpoints. Use a separate cookie jar for an ordinary user and another
for anonymous contact submissions. Admin login replaces any previous user session.

## Login and CSRF

1. `GET {{baseUrl}}/admin/auth/csrf` returns:

   ```json
   {"headerName":"X-CSRF-TOKEN","token":"<session-bound-token>"}
   ```

2. `POST {{baseUrl}}/admin/auth/login` with the returned header name/token:

   ```json
   {"email":"admin@example.com","password":"<your-admin-password>"}
   ```

   Successful response (illustrative ID):

   ```json
   {"status":true,"userId":12,"role":"ADMIN"}
   ```

3. Fetch `/admin/auth/csrf` again after login. Use this new token for every
   subsequent admin POST, PUT and DELETE. Preserve the new session cookie.
4. `GET /admin/auth/session` returns the authenticated identity in the same
   shape as the successful login response.
5. `POST /admin/auth/logout` with CSRF returns `{"status":true}` and invalidates
   the session. Further protected requests must fail until login again.

Optional Postman Tests script on either CSRF request:

```javascript
pm.test("CSRF request succeeded", () => pm.response.to.have.status(200));
const csrf = pm.response.json();
pm.environment.set("csrfHeader", csrf.headerName);
pm.environment.set("csrfToken", csrf.token);
```

Set mutation request header key `{{csrfHeader}}`, value `{{csrfToken}}`.
Do not export environments containing credentials, session cookies or tokens.

## Response and pagination conventions

Successful controller responses currently use HTTP **200**, including creation.
Most admin reads use `{"status":true,"data":...}`; list `data` is an array,
not a page object. Creation of an account returns
`{"status":true,"data":{"id":123}}`. Ordinary coordinator requests and public
contacts instead return `{"status":true,"id":123}`. Most admin updates/deletes
return `{"status":true,"data":{}}`.

Lists accept zero-based `page` (0–100000) and `size` (1–100, default 25).
They expose no total count or configurable sorting. Accounts sort by ascending
ID; other admin lists sort by descending ID. Own coordinator history is limited
to the newest 100 records, without page parameters. Database-backed response
field names retain their existing snake_case spelling; request DTOs use camelCase.
Do not infer an API timestamp serialization format from these illustrative IDs:
mutation inputs and statistics filters must use explicit ISO-8601 instants.

## Account management

`GET /admin/accounts?role=1&status=1&search=example&page=0&size=25`
filters by optional numeric role/status and name/email substring (search ≤100
characters). `GET /admin/accounts/123` returns safe account fields:
`id,fname,lname,email,registered_date,user_status_id,role_id,mobile,disabled_reason`.
Passwords and authentication tokens are excluded.

Roles: USER=1, ORGANIZER=2, ADMIN=3, STUDENT=4, contributor=5.
Account status: ACTIVE=1, SUSPENDED=2, PENDING=3.

`POST /admin/accounts`:

```json
{
  "firstName":"Test",
  "lastName":"Viewer",
  "email":"test-viewer@example.com",
  "password":"<unique-test-password>",
  "roleId":1,
  "statusId":1,
  "reason":"Create isolated acceptance-test account"
}
```

First/last names are required and ≤45 characters; email ≤100, normalized to
lowercase and unique. Creation passwords require at least 12 characters and at
most 72 UTF-8 bytes. Role/status default to 1 when omitted. For a coordinator
(`roleId:2`), also supply an existing `organizationId` and `position` (≤45).
For another admin use `roleId:3`; this is an authenticated admin operation.

`PUT /admin/accounts/123` uses the same profile fields, role/status and reason,
but **omit password**: supplying it rejects the request. Names/email remain
required; omitted role/status retain current values. Promotion to coordinator or
changing their organization requires organization/position fields.

The following requests all take `{"reason":"Reason for this operation"}`:

| Method | Path | Effect |
| --- | --- | --- |
| POST | `/admin/accounts/123/disable` | Suspend access |
| POST | `/admin/accounts/123/enable` | Restore active status |
| POST | `/admin/accounts/123/revoke-coordinator` | Restore recorded USER/STUDENT role; legacy fallback USER |
| DELETE | `/admin/accounts/123` | Permanent deletion only without linked records |

Reasons are nonblank and ≤1000 characters. Self-disable/demotion/deletion and
removing the last active admin return 409. Linked records block deletion; disable
instead. Revocation preserves account access and membership history.

## User-requested coordinator access

In an **ordinary active user/student session**, first fetch
`GET /coordinator-requests/csrf`. Submit with that session's CSRF header:

`POST /coordinator-requests`:

```json
{"organizationId":7,"position":"Event organizer","message":"Please review my coordinator application"}
```

Organization must already exist; position ≤45, message ≤200, both nonblank.
`GET /coordinator-requests` returns only the signed-in user's history. This guide
does not introduce an organization creation endpoint. Obtain a valid ID from an
authorized test fixture/operator; do not invent it.

In the admin session, use `GET /admin/coordinator-requests?status=1` and then
`POST /admin/coordinator-requests/456/decision`:

```json
{"approve":true,"reason":"Organization membership verified"}
```

Send `approve:false` with a rejection reason to reject. Always explicitly send
the boolean (the Java primitive defaults to false if omitted). Request status:
PENDING=1, APPROVED=2, REJECTED=3. Duplicate pending requests, repeated decisions,
an inactive/changed applicant or incomplete legacy organization details conflict.
Approval updates role/membership and queues notification atomically; rejection
preserves ordinary user access.

## Event review and scheduling

`GET /admin/events?status=2&phase=ONGOING&page=0&size=25` combines independent
review and schedule filters. Review status: PENDING=1, APPROVED=2, REJECTED=3,
DRAFT=4. Phase is case-sensitive: ALL (default), UPCOMING, ONGOING, COMPLETED,
UNKNOWN. Legacy events without explicit times are UNKNOWN. Disabled events are
not automatically excluded: inspect `disabled_at`.

Fetch `GET /admin/events/789` and use its current `revision` for edits/decisions.
`POST /admin/events/789/decision`:

```json
{"approve":true,"revision":0,"reason":"Event details reviewed"}
```

Only pending, enabled events can be reviewed. Approval requires an active
coordinator/admin publisher. Send explicit `approve:false` for rejection.
`PUT /admin/events/789`:

```json
{
  "name":"Reviewed test event",
  "description":"Updated event description",
  "startsAt":"2026-12-01T09:00:00+05:30",
  "endsAt":"2026-12-01T17:00:00+05:30",
  "revision":1,
  "reason":"Correct the approved schedule"
}
```

Name is required ≤100; description may be null or ≤20000 characters; start/end
are required with end strictly after start. Display times in Asia/Colombo.
After a successful change, fetch the event again before another revision-based
write. A stale revision returns 409; do not blindly repeat a decision.

`POST /admin/events/789/disable` and `DELETE /admin/events/789` take a reason
body. Linked records block permanent deletion. Disable preserves history and
does not perform cancellation refunds. No event re-enable API is implemented.

## Contact inbox and notifications

Anonymous contact submission still needs a session-bound token from
`GET /contact/csrf`, then `POST /contact`:

```json
{"email":"visitor@example.com","subject":"Booking question","message":"Please help with my booking"}
```

Nonblank limits: email 254, subject 200, message 10000 characters.
Admin uses `GET /admin/contacts`, `GET /admin/contacts/321`, then
`POST /admin/contacts/321/reply`:

```json
{"message":"Thank you. We are reviewing your question."}
```

Reply ≤10000 characters, one reply per contact. Success:
`{"status":true,"data":{"delivery":"QUEUED"}}`. This is not proof of delivery.
List responses exclude message bodies; detail includes `body` and `reply_body`.

`GET /admin/emails` returns metadata only:
`id,status,attempts,available_at,leased_at,provider_operation_id,created_at`.
States are QUEUED, PROCESSING, ACCEPTED and FAILED. ACS disabled means messages
remain queued. ACCEPTED is provider acceptance, not inbox delivery.
`POST /admin/emails/654/retry` with a reason retries FAILED messages only, resets
attempts and returns queued delivery. A missing/nonfailed ID returns 409.
`GET /admin/audit` lists actor/action/target/reason/time records.

## Statistics

```text
GET /admin/statistics?from=2026-11-01T00:00:00Z&to=2026-12-01T00:00:00Z
GET /admin/statistics?from=2026-11-01T00:00:00Z&to=2026-12-01T00:00:00Z&userId=123
```

Both instants are required: inclusive from, exclusive to, increasing range. The
current validator permits up to 3660 whole days (`Duration.toDays()` truncates
partial days). Optional userId must be positive. Encode `+` as `%2B` when passing an offset
in a URL, or use UTC `Z`. Current status breakdowns are snapshots, not historic
status reconstruction. Financial totals retain UNKNOWN currency for legacy data
and expose invalid amounts separately. See [statistics limitations](admin-backend.md#events-and-statistics)
before treating any totals as revenue, paid sales or refunds.

## Errors and acceptance checks

Service errors handled by the scoped advice use this shape:

```json
{"status":false,"message":"Request already reviewed"}
```

Security-filter errors and malformed JSON/type conversion can use a different
framework response; clients must handle HTTP status, not assume every failure
has this exact body.

| Status | Typical trigger |
| --- | --- |
| 400 | Invalid fields, filters, pagination, instants or malformed JSON |
| 401 | Unknown/ineligible admin, incorrect password or unauthenticated protected access |
| 403 | Missing/invalid CSRF or authenticated access without the required role |
| 404 | Missing account, event, request or contact on applicable routes |
| 409 | Duplicate email/request, reviewed decision, stale revision, linked deletion or self-protection |
| 429 | Login/contact throttle exceeded |
| 503 | Database unavailable or Redis unavailable during throttle check |

Login counts all attempts: 10 per normalized email, 50 per backend peer per
15 minutes. Contact allows 5 per peer per 15 minutes. Behind the gateway the
backend peer allowance is shared. Do not flush shared Redis to reset tests.

Recommended isolated manual sequence:

1. Confirm anonymous admin reads and mutation requests without CSRF are rejected.
2. Login, refresh CSRF, inspect session and list accounts.
3. Create a test user, edit, disable and enable it; confirm corresponding audit
   and outbox records. Check duplicate email and self-disable rejection.
4. As that ordinary user submit a coordinator request; review as admin. Verify
   role change, duplicate-decision rejection, and revocation restoring user role.
5. Using an isolated event fixture, edit and review with revision checks. Confirm
   a stale revision and deletion with linked records return 409.
6. Submit an anonymous contact, reply as admin, verify queued email and repeated
   reply rejection. Leave ACS disabled for these tests.
7. Check date-filtered/individual stats against known fixture records, logout,
   and verify the former session cannot read admin data.

Automated tests (Docker required for disposable MySQL and runtime smoke):

```bash
mvn -f backend/pom.xml verify
mvn -f backend/pom.xml package spring-boot:repackage -DskipTests
mvn -f gateway/pom.xml package -DskipTests
python3 infra/ci/runtime_smoke.py
```

These commands are instructions, not a claim of a new test run. Previously
recorded results and external blockers are in the [validation report](admin-backend-validation.md).
