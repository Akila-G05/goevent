# Admin backend validation — 2026-11-14

## Postman CLI verification follow-up

Postman CLI 1.90.0 ran the local acceptance collection through
`python3 infra/ci/admin_postman_smoke.py`: **73 requests and 82 assertions passed,
zero failures**. Requests exercise real backend HTTP sessions and CSRF, account
creation/edit/access/deletion restrictions, another-admin creation/deletion,
ordinary-member coordinator applications/approval/revocation, event edits and
review revisions, linked-event deletion protection, contact submission/replies,
statistics, audit metadata, queued email metadata and gateway anonymous denial.
Database assertions confirm audit/outbox writes, all emails remaining QUEUED
with ACS disabled, and preservation of the linked booking.
The complete runtime harness also passed startup/migrations, admin login
throttling, gateway cache/bypass/429, Redis outage/recovery and invalid-migration
startup rejection. Disposable services and temporary credentials were cleaned up.

Fresh verification also passed **34 backend tests**, **2 gateway tests**,
**32 infrastructure tests**, **35 frontend tests** and frontend TypeScript checking.
The Postman runner uses a random password and temporary local environment with
cloud run-event reporting disabled. No real ACS send, external Google login,
production Azure verification or new image vulnerability scan is covered.
The original evidence below describes the implementation checkpoint before
commit `6396f12`; it is retained as historical evidence, not current Git status.

Branch: `vinura/admin-backend`, based on `6b743db`. All changes are uncommitted;
no GitHub publication, VM installation, shared-database migration or Azure
resource change was performed.

## Evidence

- Backend `mvn verify` plus Boot repackage: **34 tests passed**, including real
  disposable MySQL 8.4 integration tests. The final run includes publisher
  eligibility, concurrent admin protection, request decisions, foreign-key
  deletion restrictions, revision conflicts, coordinator membership history,
  restoration of student access and protection against profile approval bypass.
- V3-to-V4 upgrade test preserves existing users, password width, old tables,
  unknown event timestamps and unknown payment currency. Fresh V1–V4 migration
  and outbox lease/retry guards also pass. Flyway clean is used only against the
  test's dedicated container URL, never environment-configured databases.
- Complete isolated application smoke: **passed**, including MySQL migrations,
  backend/gateway startup, missing-token rejection, real admin CSRF/login throttle,
  Redis caching/bypass, HTTP 429, Redis failure/recovery and invalid migration
  rejection. ACS is explicitly disabled in this harness.
- Gateway Maven verification: **2 tests passed**.
- Frontend typecheck, **35 tests**, and production build: **passed**. Existing
  profile-page `<img>` lint warnings remain; no frontend source was changed.
- Infrastructure suite: **32 tests passed**. Compose/schema/Python validation
  and diff checks passed.
- Redis-only dependency smoke: **passed** TLS/ACL isolation, admin throttle Lua
  and counter expiry; gateway cannot read throttle keys. Complete Caddy build
  verification was not repeated successfully locally during this work.
- Repository Semgrep rules: **zero findings**. Gitleaks source scan: **no leaks**.
- Backend container build: **passed**. Trivy image scan: **incomplete**, because
  the vulnerability database download timed out. No vulnerability waiver or
  scanner bypass was added; mandatory CI security gates are unchanged. The
  latest profile policy changes still require the final image-security gate.
- ACS config/worker tests use disabled delivery or mocks: **no real emails sent**.

Read-only checks against the existing local MySQL container confirmed applied
history still ends at V3, with zero duplicate-email groups, duplicate pending
coordinator requests or conflicting draft-status ID 4. Those checks are not
production evidence and do not authorize applying V4 there.

## Change inventory

- `backend/pom.xml`: Boot-managed Spring Security and pinned ACS Email/Identity
  SDK dependencies; shared BCrypt retained.
- `config/AdminSecurityConfig.java`, `controller/AdminAuthenticationController.java`,
  `service/AdminAuthenticationService.java`, `service/AdminLoginThrottle.java`,
  `repository/AdminAccessRepository.java`: dedicated admin login, CSRF/session
  security, current database authorization and Redis-backed throttling.
- `controller/AdminController.java`, `controller/CoordinatorRequestController.java`,
  `controller/ContactController.java`, `controller/AdminWorkflowExceptionHandler.java`,
  `dto/AdminRequests.java`: typed backend APIs and bounded input/error contracts.
- `service/AdminManagementService.java`, `repository/AdminRepository.java`:
  transactional account/moderation/contact workflows, mutex/last-admin protection,
  audit/outbox persistence and restricted permanent deletion.
- `service/AdminStatisticsService.java`, `repository/AdminStatisticsRepository.java`:
  bounded UTC ranges and overall/individual statistics, explicit incomplete-money
  semantics and unknown history.
- `config/AcsEmailConfig.java`, `service/AdminEmailDelivery.java`,
  `service/AdminEmailWorker.java`, `repository/AdminEmailRepository.java`: opt-in
  managed-identity ACS delivery, leased outbox, retries and accepted-status tracking.
- Existing `repository/AuthenticationRepo.java`, `repository/UserRepo.java`,
  `service/AuthenticationService.java`, `service/UserService.java`: fresh account
  status/role checks, user-requested coordinator policy, latest organization
  assignment and prevention of self-service organization approval bypass.
- `src/main/resources/db/migration/V4__admin_workflows.sql`: additive workflow,
  audit/contact/outbox schema and required indexes/defaults. V1–V3 unchanged.
- `src/main/resources/application.yml`, `.env.example`: disabled-by-default ACS
  configuration with no real credentials.
- `src/test/java/com/goevent/config/{AdminSecurityConfigTest,AcsEmailConfigTest}.java`
  and `service/{AdminAuthenticationServiceTest,AdminLoginThrottleTest,AdminEmailWorkerTest,AdminWorkflowsIntegrationTest,CoordinatorRegistrationPolicyTest,CoordinatorProfilePolicyTest}.java`:
  authentication, authorization, CSRF, moderation, migration, race and delivery tests.
- `infra/ci/runtime_smoke.py`, `infra/ci/dependency_smoke.py`,
  `infra/config/redis/redis.acl.example`: real HTTP checks, explicit test email
  disablement and narrow throttle-key permissions; complete dependency CI remains
  the default, with a clearly labelled Redis-only diagnostic mode.
- `README.md`, `docs/architecture/admin-authentication.md`, `admin-backend.md`,
  this report and `docs/decisions/0004-admin-backend-impact.md`: endpoint contracts,
  evidence, compatibility changes and operational prerequisites.

## Remaining external checks

Before activation: approve the schema/backup/restore plan and uniqueness checks;
provision a valid admin through an authorized password process; complete the image
security scan; configure the verified ACS domain/sender and scoped identity access;
resolve the documented container IMDS restriction without weakening the existing
guard. Verify real provider acceptance, inbox delivery, quota and failure handling
in an authorized staging environment. Keep production deployment disabled.
