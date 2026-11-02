# Dependency security migration — 2026-11-02

Owner authorization for targeted application dependency changes and the Boot 4
architecture migration was given during this task. These changes supersede the
prior infrastructure-only boundary for the listed manifests and compatibility edits;
no production rollout or database migration was authorized or performed.

## Selected versions and compatibility changes

- Backend/gateway: Spring Boot 4.0.9 and Java 21. Gateway imports the compatible
  Spring Cloud 2025.1.4 BOM. Framework, Tomcat, Netty and Jackson versions come from
  Boot's managed dependency families, not ad-hoc cross-major overrides.
- Backend: replace legacy web, standalone Flyway auto-configuration and session
  dependencies with Boot 4's webmvc, flyway, and session-data-redis starters.
  Update test dependency artifact IDs for the Boot-managed Testcontainers 2 line.
  Google API client remains in place; manage its transitive Guava at 33.7.2-jre.
- Gateway: Bouncy Castle bcprov-jdk18on 1.85 security pin. Switch only the two cache
  filters' ObjectMapper imports to Jackson 3 (`tools.jackson.databind`) and replace
  removed `HttpHeaders.containsKey` with `containsHeader`. Cache JSON
  model, route logic, limits, roles and business rules are unchanged.
- Frontend: Next.js / eslint-config-next 15.5.28, React/React DOM 19.3.1,
  React type definitions 19.3.0, Vitest 4.1.0, Vite 6.4.4, Axios ^1.21.0,
  PostCSS 8.5.32. A same-major PostCSS override patches Next's nested pinned
  parser too; it does not suppress scan findings. Other direct ranges are retained.
- Bun remains the package manager and CI runner. Regenerate bun.lock with Bun;
  update the existing npm lock as metadata only (`--package-lock-only --ignore-scripts`)
  so the legacy file does not retain stale vulnerable trees. npm is not used to
  install runtime packages or run the frontend.
- Explicit ES2017 TypeScript target is Next 15's generated compatibility setting;
  retain original formatting for the rest of tsconfig.json.
- Match backend Docker/CI executable-WAR packaging plugin to Boot 4.0.9.

## Risk / blast radius

This is a major framework migration affecting dependency graphs, HTTP codecs,
servlet container version, Redis/session auto-configuration and frontend rendering
and test tooling. Java 21, MySQL 8.4, JDBC, Flyway, separate gateway/Redis, App Router,
Bun, Vercel, Azure identity/storage/release architecture remain. No SQL migration,
API field rename, payment/booking state change or production configuration edit is
included. Existing Redis cache/session compatibility still needs a staging rollout
review; successful fresh-instance checks do not prove every persisted session works.

The existing main methods discard command-line arguments. The new smoke harness
uses supported Spring environment properties instead; no unrelated startup code
was changed. Existing migration SQL is executed only in a fresh disposable database.

## Verification contract

`python3 infra/ci/runtime_smoke.py` starts disposable MySQL/Redis, runs executable
backend/gateway archives, checks fresh Flyway startup, backend API, gateway health,
routed/cached repeated responses, Authorization/Cookie cache bypass,
Flyway history and HTTP 429 rate limiting, then removes only its
own test services. It never uses the root Compose database. This check is included
in PR/trusted-main CI and required before publication.

Run frontend frozen install, typecheck, lint, unit tests and production build;
start the built frontend and verify homepage HTTP 200. Run Maven verify/package
for both Java modules, infrastructure policy tests, Docker builds, non-root checks,
and fresh full security scans. The current branch has no Java test sources, so
Maven success alone is not a unit-test claim. Real OAuth, purchases, payments and
production credentials are not exercised by these smoke checks.

Rollback requires reverting the dependency/lockfile/compatibility/packaging edits
as a cohesive set, rebuilding and rescanning. Do not restore an insecure release
into production merely because a build fails. No schema rollback or volume reset
is part of this migration. The owner subsequently authorized updates to AGENTS.md, README.md and the
architecture overview to reflect this migration. Historical ADRs retain their
original decision context; the current baseline is recorded in those updated guides.

## Primary references

- https://spring.io/projects/spring-cloud/ (release-train compatibility)
- https://docs.spring.io/spring-boot/4.0/ (Boot 4 documentation)
- https://spring.io/security/cve-2026-47884/
- https://spring.io/security/cve-2026-47890/
- https://spring.io/security/cve-2026-47892/
- https://nextjs.org/blog/nextjs-security-update-october-14-2026
- https://vitest.dev/guide/migration/

Framework 6.2.20 security backports are enterprise-only; public fixes are in 7.0.9
or later. This was the reason for obtaining explicit Boot 4 migration approval.
The scanner and vendor may assign different severities; gates were not weakened
or findings ignored on that basis.

The owner must add `Isolated application smoke` to required PR checks after the
first GitHub run. The trusted publication job also depends on this check. Smoke
logs are uploaded with three-day retention; test passwords are generated locally
and are never passed in command arguments or uploaded as environment files.

## Existing application issues outside this dependency change

- The Next rewrite/default client prefix is `/api/v1`; gateway/backend routing is
  `/goevent/api`. Staging must explicitly reconcile the frontend API base/proxy
  configuration. A homepage HTTP 200 is not proof that the default login path works.
- `AuthenticationController` currently prints the received Google ID token. The
  application owner must remove that credential logging before production; this
  narrowly scoped dependency migration does not change authentication logic.
- Flyway's bundled MySQL support emits a tested-version warning for MySQL 8.4;
  the isolated V1 migration succeeds. The migration also emits a pre-existing
  `utf8`/UTF8MB3 alias warning. No existing SQL was edited to suppress warnings.
- There are no Java test source files in this checkout. The new real-service
  smoke test covers compatibility, not payment/booking/authorization regression
  coverage. Valid Google OAuth and persisted production Redis sessions still
  require controlled staging verification.

## Local verification commands

Run from the repository root (Docker required; no Azure/production access):

```sh
mvn -B -ntp -f backend/pom.xml clean verify org.springframework.boot:spring-boot-maven-plugin:4.0.9:repackage
mvn -B -ntp -f gateway/pom.xml clean verify
python3 infra/ci/runtime_smoke.py
(cd frontend && bun install --frozen-lockfile && bun run typecheck && bun run lint && bun run test && bun run build)
python3 infra/ci/verify.py
python3 -m unittest discover -s infra/tests -v
# After installing the reviewed tooling with infra/ci/bootstrap.py:
PATH="$PWD/infra/validation/bin:$PATH" actionlint
zizmor --format plain .github/workflows
hadolint infra/docker/backend.Dockerfile infra/docker/gateway.Dockerfile
# Canonical builds, HIGH/CRITICAL image gates, SBOMs and non-root checks:
sh infra/ci/images.sh
# Complete infrastructure/frontend dependency/security gate:
sh infra/ci/security.sh
```

Use the pinned Bun 1.4.4 and Java 21. Python dependencies/tool versions are in
`infra/ci/requirements.lock` / `tools.lock.json`; the local validation virtualenv
and tool binaries are ignored. The image and security gates download current
scanner databases and fail if required scans fail. No exceptions or ignored
vulnerabilities were added for this migration.

## Executed results (2026-11-02)

These results supersede older build/scan observations in the infrastructure audit.

| Check | Local result |
| --- | --- |
| Backend Boot 4 `clean verify` and executable WAR packaging | PASS; no Java test sources exist |
| Gateway Boot 4 `verify` and executable JAR packaging | PASS; no Java test sources exist |
| Disposable MySQL 8.4 migration and backend/gateway/Redis smoke | PASS, including history, JSON request binding, cache serialization, authenticated cache bypass and HTTP 429 |
| Bun frozen install, TypeScript, lint, Vitest and Next production build | PASS; 1 frontend test |
| Built frontend HTTP homepage | HTTP 200 |
| Both frontend lockfiles, including development dependencies | 0 HIGH / 0 CRITICAL |
| Backend canonical Docker build | PASS |
| Backend OS + Java image scan and image secrets | 0 HIGH / 0 CRITICAL / 0 secret findings |
| Gateway canonical Docker build | PASS |
| Gateway OS + Java image scan and image secrets | 0 HIGH / 0 CRITICAL / 0 secret findings |
| Both images: non-root, read-only runtime/archives, no build tools, no network/capabilities | PASS; runtime Temurin 21.0.13 |
| Backend/gateway CycloneDX SBOM generation | PASS |
| YAML, Python syntax, manifest/Compose checks | PASS |
| Infrastructure policy/negative tests | 14 PASS |
| actionlint, zizmor, Hadolint, ShellCheck | PASS; existing 3 zizmor suppressions unchanged |
| Gitleaks working source snapshot | 0 leaks |
| Configured Semgrep checks | 0 findings; 2 existing rules, 35 source files |
| Trivy infrastructure misconfiguration gate | 0 HIGH / 0 CRITICAL Dockerfile findings |

Local full-image scans use Trivy 0.76.1 at the repository's pinned digest,
current vulnerability and Java databases downloaded on November 2, isolated
in-memory scan caches, and read-only database mounts. Offline analysis is used
only after database freshness is verified; no finding severities or ignore rules
are changed. Two HTTP/2 database downloads failed; a TLS-protected HTTP/1.1
retry (`GODEBUG=http2client=0`) completed. A failed download was never counted as
a successful scan. CI retains its fresh-database, fail-closed image scan gate.

Full JSON reports, CycloneDX SBOMs, image archives and detailed logs remain in
ignored `infra/validation/`; they are not committed. GitHub-hosted validation,
Azure publication, production promotion and staging OAuth/persisted-session
checks have not run for these uncommitted changes. No Azure operation, production
database operation, commit or push was performed during this upgrade.

## Affected files

- `.github/workflows/pr-ci.yml`, `.github/workflows/publish-acr.yml`: mandatory
  isolated smoke job and restricted-retention diagnostic logs.
- `backend/pom.xml`, `gateway/pom.xml`: compatible dependency versions/starters.
- `gateway/src/main/java/com/goevent/gateway/filter/ResponseCacheGatewayFilterFactory.java`
  and `ResponseCacheGlobalFilter.java`: Jackson 3 imports / Spring 7 header API.
- `frontend/package.json`, `frontend/bun.lock`, `frontend/package-lock.json`,
  `frontend/tsconfig.json`: patched tool/dependency graphs and Next target setting.
- `infra/docker/backend.Dockerfile`: matching Boot repackage goal.
- `infra/ci/generate_workflows.py`, `infra/ci/runtime_smoke.py`: reproducible CI
  generation and disposable regression harness.
- `infra/.gitignore`: generated local log exclusion.
- `infra/docs/DEPENDENCY-MIGRATION.md`: approval, blast radius, evidence and handoff.

The subsequent owner-authorized documentation update also changes AGENTS.md,
README.md and docs/architecture/overview.md: current versions, actual folder
layout, test coverage, deployment boundaries and a mandatory complete commit
change inventory. No SQL migrations, root Compose configuration, application
YAML, frontend components or business services were changed. Work remains uncommitted on `vinura/prepare-container-infrastructure`.
