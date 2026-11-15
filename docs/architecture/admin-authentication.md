# Admin authentication foundation

This page describes authentication. The additional management, moderation,
statistics and ACS notification APIs are documented in [admin backend](admin-backend.md).
There is no impersonation and no default administrator/password.

Routes use the existing servlet context and controller prefix:

| Method/path | Purpose |
| --- | --- |
| GET `/goevent/api/admin/auth/csrf` | Obtain session-bound token and header name |
| POST `/goevent/api/admin/auth/login` | JSON `email`, `password`; active admin only |
| GET `/goevent/api/admin/auth/session` | Inspect authenticated admin identity |
| POST `/goevent/api/admin/auth/logout` | Invalidate session |
| POST `/goevent/api/admin/auth/switch-to-user` | CSRF-protected own-account user mode |
| POST `/goevent/api/admin/auth/switch-to-admin` | CSRF-protected return from server-created user mode |

Keep cookies between requests. Fetch CSRF first and send its `token` in the
returned `headerName` on login. Successful login invalidates the previous
session, including its CSRF token and ordinary user identity. Fetch a fresh CSRF
token before logout or subsequent admin mutations. The connected
[admin frontend](admin-frontend.md) handles this flow through the shared password
login page. Existing user/Google API routes retain their current contract;
successful ordinary login now replaces the previous session to remove any
elevated attributes.

The admin session response additively includes `name` and `email` for the current
account only. The name is built from current database first/last name fields,
falling back to email when both are blank. No password or token is returned.
The sidebar uses this identity in its account dropdown, with Switch to user and
Log out actions. It does not infer identity from a browser-submitted role.

Mode switching accepts no target identity. The server rotates the session in
both directions and never changes the database role. Switching to user mode
removes `adminUserId`, sets the same account's ordinary `userId` and a server-only
return marker, and exposes `adminUserMode: true` through `/auth/session` for UI
display. Admin API access is denied in user mode. The return endpoint alone
accepts that matching marker, requires CSRF and rechecks active ADMIN status
against the database. Ordinary user sessions, submitted roles, mismatched markers
and disabled/demoted/deleted admins cannot use it to elevate.

The security chain covers `/api/admin/**`, coordinator requests and contact
submission inside the backend servlet context. Only the latter two flows have
their explicitly documented member/public access; other routes remain admin-only.
It rejects anonymous/non-admin access and queries the current database role and
account state on each request. Redis contains the dedicated `adminUserId`
session attribute; submitted roles and ordinary login session roles cannot
authorize an admin request. No cached Spring Security context can bypass the
fresh database check. Expired sessions require login again; disabled/demoted or
deleted accounts lose admin access on their next request.

Login allows only existing active role-3 accounts with a matching BCrypt
password. Unknown accounts, wrong passwords and ineligible accounts receive the
same 401 message. Invalid payloads receive 400. BCrypt inputs are capped at 72
UTF-8 bytes. Existing admins without a password need a separately authorized
account-provisioning/password process to use this password endpoint.
The existing Google endpoint can instead create the same dedicated admin session
for an active database admin resolved by the verified Google subject, after the
existing signature/audience/verified-email checks. The frontend verifies that
session and redirects to `/admin`. Non-admin Google sessions cannot authorize
admin requests; selecting a role in the UI never promotes an account.

An atomic Redis fixed-window counter allows 10 attempts per normalized email
and 50 per backend socket peer in 15 minutes, counting successful attempts too.
Keys hash identifiers and expire automatically; no credentials enter the keys.
Limits return 429 and Redis failure returns 503 before password lookup. Behind
the gateway the peer allowance is shared; forwarded headers are not trusted to
give attackers arbitrary rate-limit identities. This conservative limit may
need adjustment with a reviewed trusted-proxy design at deployment scale.

The production backend Redis ACL additionally needs `~goevent:admin-login:*`.
The repository template includes this exact namespace; gateway access remains
excluded. A host operator must stage the reviewed ACL separately—no running
Redis or Azure resource is changed by this work.

## Impact and verification

New controllers call a service, database role checks belong to a repository,
and the security filter is constructed only within the admin chain. Spring
Security is added under the existing Boot dependency management. Default-user
generation is disabled; no Basic/form login is configured. No SQL migration is
needed for this foundation, and V1–V3 remain unchanged.

Regression tests cover active/inactive/non-admin credentials, session
replacement, input validation, database-backed revocation, CSRF rejection and
logout, throttle limits and Redis failure. Disposable dependency smoke checks
the Lua script and ACL separation; application runtime smoke checks legacy
startup, routing, cache and Redis behavior. These checks do not prove dashboard
or account-management features exist.

Local verification on 2026-11-14: backend verification/packaging passed (13
tests), gateway verification passed (2 tests), frontend typecheck and all 35
tests passed, 32 infrastructure tests passed, and the full isolated application
smoke passed including real admin CSRF/throttle checks. The Redis-only TLS/ACL
smoke passed, including Lua counter expiry and gateway denial of throttle keys.
The unrelated full Caddy source build was cancelled while downloading/building;
the complete dependency/image security pipeline has not been rerun locally.
No development database was mutated and no change was committed or pushed.
