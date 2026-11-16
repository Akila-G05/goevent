# Disabled deployment bundle: staging handoff

For the custom Caddy build, scoped ACR prerequisites and dependency approval,
read [Caddy security remediation](CADDY-SECURITY-FIX.md) before staging.

The inert bundle originated from audit revision `032e8e3`; the final repository
blocker update builds on `c9da6e7` on `vinura/coordinator-dashboard`. No VM/Azure
change, commit, push or deployment is part of this final update. The operator policy remains disabled. Promotion additionally has a
literal false repository kill switch; changing a GitHub variable cannot activate it.

## Final repository blocker review (2026-11-16)

The final changes affect upload persistence, filesystem permissions, legacy
cookie-authenticated mutations and their frontend clients. They do not change
schema, payment state, MySQL ownership, OIDC, image provenance, release approvals
or backup guards. The upload mount and deployment validator must change together;
rollback to an older application bundle must preserve the host upload directory.
CSRF tokens are fetched before each auth/profile mutation, including login and
logout; mutations are never automatically replayed after a 403 or network error.
Existing API clients must adopt the token header before this backend rolls out.
Validation covers missing/stale tokens, session replacement, revoked users,
JSON/multipart requests, symlink rejection, mount restrictions and persistence.

Validation of this update: backend verify/repackage passed (68 tests), gateway
verify passed (2), frozen Bun install, frontend tests (89), typecheck/lint and an
isolated production build passed. Infrastructure tests passed (34); isolated
browser/runtime smoke passed, including Postman (74 requests/83 assertions),
CSRF login/logout, revocation, Redis outage/recovery and migration failure.
A disposable host-bind test confirmed UID 10001 writes and replacement-container
reads; Redis TLS/ACL checks passed. Security gates passed using the authoritative
GHCR vulnerability DB for the frontend scan after the default mirror timed out;
no repository scanner settings or thresholds were changed. Fresh full image
scanning remains unverified: Caddy build stalled on Go dependency downloads and
Java DB downloads could not finish promptly, so those local processes were stopped.
Do not treat this as an image security pass; rerun the unchanged image gate before
application activation. No VM/Azure operation, shared-data migration or real email
was performed. Inert bundle installation remains distinct from startup approval.

## Impact and boundaries

High-risk transport/configuration and deployment change. Business services,
DTO contracts, database SQL and production MySQL Compose/bootstrap are preserved.
Minimal application changes remove token output, rotate login sessions, validate
CORS origins, align the browser API/login prefix and enforce proxy-aware,
fail-closed Redis limiting. The legacy `/api/v1` browser rewrite remains compatible.
No major dependency or lockfile changes are required. Existing security/publication
checks remain; runtime TLS/outage tests and Redis/Caddy image scans are added.

Backend/gateway remain the only release-managed services. Redis/Caddy belong to
`goevent-dependencies`; the protected MySQL service/network belongs to neither.
The existing bridge `goevent_goevent_internal` is external, internal=true and
attachable=false; those flags do not prevent attaching ordinary Compose containers
to this local bridge. Never change it, attach Caddy/gateway/Redis to it, or merge
these files with `/opt/goevent/compose.yml`.

| Network | Members | External access |
| --- | --- | --- |
| existing MySQL bridge | existing mysql, backend | No |
| goevent-application, 172.29.241.0/28 | backend .2, gateway .3, redis | No |
| goevent-ingress, 172.29.240.0/28 | caddy .2, gateway | No |
| goevent-backend-egress | backend | Google token verification only through reviewed host egress controls |
| goevent-edge | caddy | ACME/HTTPS |

Before creating the new networks, verify subnet overlap with VM/VNet/VPN/Docker
routes. These addresses are a trust contract: if changed, change/test Caddy trusted
peer and backend Tomcat proxy settings together. Block container access to IMDS
169.254.169.254 with reviewed host controls; neither Compose nor this repository
claims that firewall policy is installed. Caddy replaces forwarding headers with
its socket peer. Do not put another unreviewed proxy/CDN in front of it. Vercel
proxy traffic can share a socket IP; use direct browser-to-API HTTPS with explicit
production origins when per-client limits are required.

## Configuration and secret contract

Install `config/{backend,gateway}/application.properties` as external config, and
`compose/redis.conf.example` / `compose/Caddyfile.example` as `redis/redis.conf` /
`caddy/Caddyfile`. Use `config/caddy/Caddyfile.staging` instead on isolated staging.
Every config/runtime directory must be root:10001, mode 0750; every file root:10001,
mode 0640. Do not give human users membership in GID 10001. No symlinks, special
files, group-writable or world-readable runtime/config files are accepted. Configuration/secret binds
are read-only; only the backend image-upload bind is writable. Missing source
paths are never automatically created.

`deploy/operator-policy.example.json` enumerates all runtime files under
`/run/goevent`. Existing protected Key Vault bootstrap must produce these files;
this bundle neither reads nor rewrites its existing `/run/goevent/secrets` or
`/run/goevent/mysql-secrets` stores. Never print their contents. Stage only a
reviewed inventory, not arbitrary files from a secret store.

- Backend: datasource password for **goevent_app**, separate **goevent_migration**
  password (or explicitly reviewed migration username override), PKCS12 MySQL CA
  truststore, `MYSQL_TRUSTSTORE_PASSWORD`, Redis backend ACL password/CA,
  `GOEVENT_ALLOWED_ORIGINS` and `GOEVENT_GOOGLE_CLIENT_ID`.
- Gateway: its distinct Redis ACL password/CA and `GOEVENT_ALLOWED_ORIGINS`.
- Redis: server certificate/key, CA, rendered `redis.acl` and health-password.
  Replace all three ACL hash markers with SHA-256 hashes of distinct random
  passwords from the approved secret system. Redis ACL files do not accept comment
  lines; do not prepend comments. Never install the marker file unrendered.
- MySQL certificate SAN must match `mysql`. Both datasource and Flyway use
  sslMode=VERIFY_IDENTITY and the supplied truststore/password. No TLS bypass,
  root DB login, automatic baseline/repair/clean or schema-reset path is provided.
- Redis SAN must match `redis`. Both apps use verified TLS and separate ACL users.
  TLS-only server port 6379 is private; plaintext port is disabled. The health user
  can only PING. Backend keyspace notification subscription is explicitly allowed;
  Spring does not issue CONFIG commands with runtime credentials.

Redis is deliberately ephemeral: no RDB/AOF, maxmemory 256MB within a 384MB container,
noeviction. Restart invalidates sessions, cache and limiter state. This requires
operator acceptance; it is not durable session storage. At memory exhaustion,
limiter failures return 503; do not change to fail-open. Review capacity/load tests.
Caddy certificate state is the sole persistent dependency bind; its owner is UID
10001, mode 0700, under `/var/lib/goevent-caddy`. It is not a database volume.

Secure/HttpOnly/SameSite=None cookies support the explicitly approved cross-site
HTTPS origin. Validate real browser login, cookie scope and CSRF protection before
production. The existing Spring Security chain now protects all implemented
state-changing API families, including legacy auth/profile JSON and multipart
requests. GET /goevent/api/auth/csrf is public and returns a session-bound token;
clients send its X-CSRF-TOKEN header before each mutation, including login/logout.
Login replaces the session, so pre-login tokens cannot be reused. Public content
and exact managed-image reads remain accessible; there is no directory listing.
Management is health-only, not routed publicly. Production app logs are WARN;
query strings and Google credentials are not logged by the changed paths.

## Persistent image storage

The only writable persistent application bind is host `/var/lib/goevent-uploads`
→ backend `/app/uploads`; the production backend config fixes `app.storage.root`
to that container path. Gateway has no access to this bind. Keep its parent
root-owned and non-writable by application users; the leaf must be **10001:10001,
0700**, without symlink ancestors. Image directories/files are created 0700/0600.
Only managed scope/owner/UUID paths can be served. Symlink paths are rejected for
upload/read/delete; no static directory handler or file browser is installed.
Private authorization documents remain in MySQL, not this public-image directory.

Use the VM OS filesystem or a separately approved persistent upload disk, never
`/srv/goevent/mysql` or the protected MySQL filesystem. Deployment preflight rejects
uploads on the same filesystem as MySQL and rejects missing/unsafe directories.
Set `upload_disk_uuid` in the reviewed operator policy to the UUID returned by
`findmnt --target /var/lib/goevent-uploads --output UUID` after provisioning.
The disabled example intentionally contains OWNER_ACTION_REQUIRED. Preflight
requires that exact UUID on every release; a missing mount cannot silently fall
back to a different filesystem after reboot. UUID-less/ephemeral storage fails closed.
Provision and verify the approved filesystem before startup; Docker must not
create it implicitly. On isolated staging only, after checking the filesystem:

```sh
sudo findmnt --target /var/lib --output TARGET,SOURCE,FSTYPE,UUID
# Verify this is persistent storage separate from the protected MySQL disk.
# Create only if absent; never recursively chown existing customer data.
sudo sh -eu -c 'test ! -L /var/lib/goevent-uploads; mkdir -m 0700 /var/lib/goevent-uploads; chown 10001:10001 /var/lib/goevent-uploads'
sudo stat -c '%u:%g %a %F' /var/lib/goevent-uploads
sudo findmnt --noheadings --raw --target /var/lib/goevent-uploads --output UUID
```

For an existing directory, inspect it rather than recreating or changing it.
The bind survives container replacement and host reboot; applications still stay
off after reboot until the existing approval/startup procedure runs. Monitor disk
capacity and include images in a separately approved backup/restore policy. Never
remove uploads during application rollback or inert bundle removal. Uploads need
no new secret and do not change the database backup approval contract.

## Package and install WITHOUT activation

These commands are for an authorized operator; they are not run by the coding
agent. Use an isolated staging VM with a disposable/restored MySQL instance and
equivalent paths/network names, never the production VM for failure tests. Do not
copy production customer data without separate authorization. The restored schema,
backup readiness and migration approval must be real evidence, never test fixtures.

On the reviewed checkout, first pass the checks below, then package:

```sh
python3 infra/deploy/bundle.py pack /tmp/goevent-reviewed.tar
python3 infra/deploy/bundle.py inspect /tmp/goevent-reviewed.tar
sha256sum /tmp/goevent-reviewed.tar
```

Record the archive checksum through an independent trusted review channel. The
archive contains only infrastructure, config templates, proposed units and docs,
with a per-file checksum manifest; it contains no app source, images or secrets.
The initial source tree may be uncommitted during review, so use this archive hash,
not a claim that HEAD identifies all working-tree changes.

On the isolated staging host, copy the reviewed archive and the reviewed
`deploy/{bundle,pull,policy}.py` helper files into a root-only inbox. Example with
operator-provided source paths (do not execute unreviewed helpers as root):

```sh
sudo install -d -o root -g root -m 0700 /opt/goevent/releases/inbox
sudo install -o root -g root -m 0600 /path/to/reviewed/goevent-reviewed.tar /opt/goevent/releases/inbox/bundle.tar
sudo install -o root -g root -m 0600 /path/to/reviewed/infra/deploy/bundle.py /opt/goevent/releases/inbox/bundle.py
sudo install -o root -g root -m 0600 /path/to/reviewed/infra/deploy/pull.py /opt/goevent/releases/inbox/pull.py
sudo install -o root -g root -m 0600 /path/to/reviewed/infra/deploy/policy.py /opt/goevent/releases/inbox/policy.py
sudo sha256sum /opt/goevent/releases/inbox/bundle.tar
# Replace REVIEWED_SHA256 with the independently verified archive checksum:
sudo python3 -B /opt/goevent/releases/inbox/bundle.py stage /opt/goevent/releases/inbox/bundle.tar --sha256 REVIEWED_SHA256 --release review-staging-01
```

The installer rejects traversal, symlinks, duplicate/oversized members, bad hashes,
enabled operator policy and existing destination directories. It writes only a
new root-only `review-*` directory. It never updates `current`, installs/enables a
unit, installs packages, fetches a Blob, logs in to Azure or starts containers.

Install config templates only on isolated staging, using a fresh review directory:

```sh
BUNDLE=/opt/goevent/releases/review-staging-01
sudo install -d -o root -g 10001 -m 0750 /opt/goevent/app-config/backend /opt/goevent/app-config/gateway /opt/goevent/app-config/redis /opt/goevent/app-config/caddy
sudo install -d -o root -g 10001 -m 0750 /run/goevent/backend /run/goevent/gateway /run/goevent/redis
sudo install -d -o 10001 -g 10001 -m 0700 /var/lib/goevent-caddy
sudo install -o root -g 10001 -m 0640 "$BUNDLE/config/backend/application.properties" /opt/goevent/app-config/backend/application.properties
sudo install -o root -g 10001 -m 0640 "$BUNDLE/config/gateway/application.properties" /opt/goevent/app-config/gateway/application.properties
sudo install -o root -g 10001 -m 0640 "$BUNDLE/compose/redis.conf.example" /opt/goevent/app-config/redis/redis.conf
sudo install -o root -g 10001 -m 0640 "$BUNDLE/config/caddy/Caddyfile.staging" /opt/goevent/app-config/caddy/Caddyfile
```

For each inventoried bootstrap file use `install -o root -g 10001 -m 0640 SOURCE
DESTINATION` only after verifying its target/name. Do not use shell arguments or
environment dumps containing password values. Do not overwrite existing config
on a shared host. Keep the disabled example policy in the staged bundle; do not
replace `/etc/goevent-release/policy.json` or change the current-release pointer.

Render both Compose projects without starting anything. Set BACKEND_IMAGE and
GATEWAY_IMAGE to the reviewed ACR `repository@sha256:...` values (not tags):

```sh
: "${BACKEND_IMAGE:?approved immutable backend image required}"
: "${GATEWAY_IMAGE:?approved immutable gateway image required}"
: "${CADDY_IMAGE:?approved immutable Caddy image required}"
export BACKEND_IMAGE GATEWAY_IMAGE CADDY_IMAGE
GOEVENT_API_DOMAIN=localhost docker compose -p goevent-dependencies -f "$BUNDLE/compose/dependencies.yml" -f "$BUNDLE/compose/staging.yml" config --quiet
docker compose -p goevent-app -f "$BUNDLE/compose/applications.yml" config --quiet
sudo systemd-analyze verify "$BUNDLE/systemd/goevent-release.service"
```

No command above starts a service. `systemd-analyze` may report missing future
`current` paths or existing MySQL unit on an unprepared staging host; resolve those
prerequisites rather than weakening the unit. Do not run `docker compose up`,
`systemctl start/enable`, `fetch.py`, `pull.py`, promote or production migration as
part of installation. Do not run down -v, network rm, automatic baseline or repair.

## Isolated activation acceptance (separate approval required)

The repository is prepared for explicit isolated testing, not activated. Before
any activation, verify Docker/Compose/Java/Python/curl/nsenter/gh versions, exact
mount UUID and MySQL healthy state; subnet availability; root paths; GID/modes;
MySQL/Redis certificate identities; runtime grants and migration-only grants;
container IMDS denial; Google egress; private DNS and the restored schema/history.
Never fabricate production backup-readiness.json or migration-approval.json from
the unit test fixtures. Review a real restore and commit-bound plan first.

Use `dependencies.yml` with `staging.yml`, keeping Caddy on loopback 18080/18443.
Dependency startup is separately operator-managed: create the stopped dependencies
first (which establishes their networks), start Redis, verify authenticated TLS
health, then start only attested backend/gateway digests after approval. Open Caddy
only after backend/gateway readiness passes. Trust the private staging CA explicitly
with a client CA file; do not use curl -k or install it as a global production CA.
No dependency restart policy starts apps around the mount/Key Vault guards.

The proposed release oneshot remains active after success, so stopping its bound
MySQL service stops ingress, applications and Redis through the scoped stop helper.
It has no [Install] section and is not enabled at boot; an app reboot leaves it
closed until fresh bootstrap, disk, backup and migration approvals are rechecked.
For a new release, use operator-reviewed restart, not an ignored start on an
already-active oneshot. Never enable an unattended polling timer.

The fetch adapter requires exactly intents/BUILD_RUN_ID-PROMOTION_RUN_ID.json plus
an independently approved content SHA-256. The release container is exclusively
stgoevent/goevent-release-intents. Verify its locked immutability/retention and
private access separately; a name/hash check does not establish Azure immutability.
Keep GOEVENT_BLOB_DELIVERY_APPROVED=false and enabled=false. Before any future
promotion, configure AZURE_ACR_LOGIN_SERVER in goevent-production as well as the
publisher environment; promote.py validates candidates against it. Removing the literal
promotion kill switch or enabling policy requires a separate reviewed activation.

Production additionally requires successful trusted-main scans/SBOMs/attestations,
scoped publisher Writer and VM Reader/referrer access, correct OIDC subjects,
protected GitHub environments with reviewers and main-only rules, private Blob
roles, gh authentication for the repository, approved domain/DNS/ACME and bounded
logs, real Google login/CORS/cookie/CSRF tests, load/outage tests, actual restore
and schema compatibility evidence, and a proven rollback/reboot exercise. No
external control is claimed verified by a repository check.

Rollback is application-only, never DDL. It requires both release rollback_safe
and commit-bound operator rollback_safe, and an unexpired previous manifest.
Failed fallback stops the app pair and leaves current.json unchanged. With no
approved fallback, a failed first release is stopped. Pull/attestation failure
never starts the candidate. Removing the inert review directory reverts installation;
reverting app code does not reverse a migration.

## Automated acceptance commands

```sh
mvn -B -ntp -f backend/pom.xml verify org.springframework.boot:spring-boot-maven-plugin:4.0.9:repackage
mvn -B -ntp -f gateway/pom.xml verify
python3 -m unittest discover -s infra/tests -v
python3 infra/ci/runtime_smoke.py
python3 infra/ci/dependency_smoke.py
# frontend/: bun install --frozen-lockfile; bun run typecheck; bun run lint; bun run test; bun run build
# validation venv: python3 infra/ci/verify.py; sh infra/ci/security.sh; sh infra/ci/images.sh
```

Runtime smoke uses unique disposable containers, never a production Docker network.
It tests Redis outage, cache fallback, limiting recovery and failed MySQL DDL.
Deployment fault tests inject startup, attestation, pull/network, approval and
rollback failures without contacting Azure or creating operational evidence.
The TLS smoke uses one-day local test certificates and random disposable ACL
credentials; they are not installed in /run/goevent or packaged into the bundle.
