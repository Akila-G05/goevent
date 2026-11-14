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

Keep cookies between requests. Fetch CSRF first and send its `token` in the
returned `headerName` on login. Successful login invalidates the previous
session, including its CSRF token and ordinary user identity. Fetch a fresh CSRF
token before logout or subsequent admin mutations. No frontend changes are
included. Existing user/Google routes retain their current contract.

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
account-provisioning/password process; this change does not modify accounts.

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
