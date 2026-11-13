# Repository CI/CD and Azure handoff

Current disabled-bundle installation contract: [STAGING.md](STAGING.md). It supersedes
the historical path/network/configuration assumptions below; no activation is authorized.

## Status and architecture audit

Repository implementation is prepared, not activated in Azure or GitHub. Java 21,
Boot 3.5.7, JDBC/Flyway, MySQL 8.4, separate gateway/Redis, Vercel frontend, Caddy,
Debian 12 VM and protected database disk remain unchanged. Application compatibility
findings in `../compatibility.md` remain applicable except its earlier instruction
not to edit workflows: this directive now authorizes dedicated workflows.

Production contracts supplied by the owner: vm-goevent-01; existing protected
`goevent.service` and `/opt/goevent/compose.yml`; disk mount `/srv/goevent/mysql`,
data `/srv/goevent/mysql/data`; database `goevent_db`, runtime user `goevent_app`.
Nothing here creates a second database, changes restart policies of existing
services, runs migrations, retrieves secrets, installs units, or changes resources.

## Trust stages / required check names

- `pr-ci.yml`, **GoEvent gates**: fork PRs to main, with identical gates generated into the trusted-main workflow.
  Hosted Ubuntu 24.04 runners, contents read, no OIDC/Azure/environment credentials.
  Required jobs: **Java tests (backend)**, **Java tests (gateway)**, **Bun frontend**,
  **Security policy**, **Container security**. Require both existing legacy checks
  and these checks until owners intentionally retire duplication. Select PR check names
  observed after the first real run, not guessed synthetic statuses.
- Existing `ci.yml` jobs preserved; action refs pinned and read-only permissions,
  checkout credential protection and concurrency added. No developer test weakened.
- `publish-acr.yml`, **Trusted ACR publication**: push main only. Repeats the same
  gates. Only after success does the goevent-publish Environment job receive OIDC
  and attestation-write permission. Loads tested same-run image artifacts, refuses
  existing commit tags, publishes goevent/backend and goevent/gateway, captures
  registry digests and cryptographic GitHub build provenance for both digests.
  Produces deployment-candidate with source SHA, run ID, expiry, digest pair,
  migration plan identity and report hashes; image-reports includes CycloneDX SBOMs.
- `promote-production.yml`, **Approve production intent**: manual main dispatch,
  numeric trusted build-run ID only. Uses protected goevent-production Environment.
  Checks GitHub run event, workflow path, conclusion, repository, main ancestry,
  candidate source/run binding, schema/expiry/repositories and actual required
  reviewers configured on the Environment. Missing review support fails closed.
  Only then uses separate promotion OIDC identity to write a new immutable Blob
  object. No SSH, remote command or Docker operation from GitHub.

There is no workflow_run or pull_request_target bridge, PR publication, self-hosted
runner, registry admin password or Azure client secret. Reports have 3-day retention;
candidates 7 days. No SARIF upload privilege is requested. Artifact-only reporting
does not bypass gating. CodeQL availability is unknown; local reviewed Semgrep
rules provide limited SAST for process execution/raw HTML, not full CodeQL coverage.
Owners should evaluate broader rules/CodeQL as a separate reviewed improvement.

## Security and test operation

`infra/ci/security.sh`: actionlint, zizmor, ShellCheck, hadolint, full-history redacted
Gitleaks, scoped Semgrep, Trivy infrastructure/dependency checks and policy tests.
`infra/ci/images.sh`: builds both application contexts, scans OS/JAR vulnerabilities
and image secrets, prints machine findings safely, fails on HIGH/CRITICAL or scanner
errors, generates CycloneDX SBOMs and checks offline non-root runtime. No ignore-unfixed,
continue-on-error, ignore list, or security exceptions. Each scanner gets a private
cache; scans are serialized. A failed/incomplete scan never yields tested-images.

Action SHAs and upstream commit URLs are recorded in `infra/ci/tools.lock.json`.
Binary tooling is downloaded from explicit upstream releases and checked against
GitHub's published asset SHA256; missing digest fails. Python tooling and transitives are pinned in requirements.lock with PyPI artifact
SHA256 verification; requirements.txt is the reviewed direct-input constraint file.
Dependabot Actions version-update PRs are temporarily paused with
`open-pull-requests-limit: 0` in `.github/dependabot.yml`. Remove that setting to
resume the preserved weekly schedule. This does not disable separately configured
GitHub security updates/alerts or close existing PRs. Review tooling lock updates, do not silently accept
new rules/actions. Bootstrap currently supports Linux x86_64. CI uses Python 3.13.

Maven tests run without skip flags in CI; image packaging skips tests only after
separate required gates. Backend Testcontainers isolates MySQL. Gateway has no
existing test sources; its Maven build does not prove routing/Redis startup health.
Frontend uses committed bun.lock with frozen Bun install, all existing scripts,
and safe dummy API values. Local checks must copy developer sources under
`infra/validation/work` before running build tools, so no target/node_modules or
Next-generated files appear in read-only application directories.

## Azure OWNER ACTION REQUIRED (no automated setup)

Publishing preflight (`infra/ci/acr_tags.py`) treats only the exact requested
repository's not-found diagnostic as an empty tag list, including the Azure CLI
timestamp/correlation-ID format observed on first publication. Authentication,
authorization, connectivity, partial output and unrecognized responses stop
publication. Existing commit tags remain rejected; malformed tag lists and
post-push digests also stop candidate creation.

Both `show-tags` and `repository show --image` use repository metadata-read
permission. ABAC Repository Writer supports these operations when its conditions
cover `goevent/backend` and `goevent/gateway`; catalog-list access is unnecessary.
OIDC login, mandatory workflow gates, SHA tags, SBOMs, attestations and candidate
metadata remain unchanged. The preflight is not an atomic registry tag lock.
Failure after a push can leave an image published without a candidate; inspect
that image before retrying, since existing commit tags deliberately block retries.

`python3 -m unittest discover -s infra/tests -v` includes isolated publisher
regressions with CLI doubles, including the observed first-publication error,
existing tags, access failures, unexpected responses and digest failures. These
tests do not verify live OIDC credentials or Azure ABAC conditions; a subsequent
authorized trusted-main publication must verify those in Azure.

1. Verify existing encrypted managed disk UUID, mount guards and data directory;
   preserve existing systemd/database/Key Vault orchestration. Do not format disks,
   use resource disks, publish 3306, initialize replacement volumes or run down -v.
2. Provision private ACR and record name/login server. Use an Entra publishing
   identity with AcrPush in traditional mode, or Container Registry Repository
   Writer constrained to the two repositories under ABAC mode. VM MI needs AcrPull
   or constrained Repository Reader respectively. No subscription Owner/Contributor.
3. Create federated credentials for the exact GitHub repository and Environment
   subjects `repo:OWNER/REPO:environment:goevent-publish` and `...:goevent-production`,
   audience `api://AzureADTokenExchange`. Separate promotion identity from publisher.
   Environment branch restrictions must allow protected main only.
4. Confirm the proposed low-cost private Blob intent channel with the System
   Architect. Provision a dedicated private container with immutability/retention
   and narrowly scoped writer permissions for promotion, read-only for VM MI.
   GitHub workflow refuses overwrite; storage-side immutability is still required.
   Do not reuse or alter backup container roles/policies for release delivery.
5. Set publishing Environment variables AZURE_CLIENT_ID, AZURE_TENANT_ID,
   AZURE_SUBSCRIPTION_ID, AZURE_ACR_NAME, AZURE_ACR_LOGIN_SERVER. Set promotion
   identity variables separately and AZURE_RELEASE_STORAGE_ACCOUNT,
   AZURE_RELEASE_CONTAINER; only after channel approval set
   GOEVENT_BLOB_DELIVERY_APPROVED=true. AZURE_RESOURCE_GROUP is informational if needed.
6. Preserve host MI Key Vault bootstrap. Stage per-service config trees in
   `/run/goevent/backend` and `/run/goevent/gateway`, root-owned, group readable to
   GID 10001, no other access. Backend properties must specify goevent_db/goevent_app,
   private MySQL DNS/TLS and separate Flyway migration credentials. Never bake .env
   into images. Existing goevent.service remains owner of protected startup.
7. Supply root-owned external `/opt/goevent/app-config/{backend,gateway}` configs.
   Override all four gateway localhost URIs, Redis host/auth/ACL/TLS, management
   exposure and production logs. Approve Redis operational memory/persistence/TLS
   policy; redis.conf.example is only a template, no Redis is provisioned here.
   Verify Vercel API prefix/CORS/cookies; no app edits are made to conceal blockers.
8. Install reviewed application-only Compose and scripts under a root-owned release
   directory, Python 3, current gh/Azure CLI, Docker Compose with --wait. Verify
   external private networks connect existing protected MySQL without duplicating
   it. Do not replace /opt/goevent/compose.yml. Supply Caddy real domain/TLS/DNS and
   retain certificate storage policy; only Caddy publishes approved 80/443.
9. Provide fresh backup-readiness evidence from existing AES-256-GCM/private-Blob
   monitoring: verified_epoch, integrity_verified=true, isolated_restore_verified=true, cipher=AES-256-GCM,
   private_blob=true.
   Verify a restore, retention, RPO/RTO, key availability and alerts; repository code
   does not implement/rewrite encryption or claim backup success.
10. Review existing schema/Flyway history on a restored copy. Supply commit-bound
    migration approval (approved, plan=`plan-COMMIT`, commit, rollback_safe). No
    automatic baseline, clean or repair. Production migrations occur on startup,
    so startup is authorized only after this review. Runtime goevent_app must not
    have migration privileges if a separate migration account is provisioned.
11. Review/install health.py as the root-owned executable health hook with bounded backend database HTTP,
    gateway/Redis health, route and cache/rate-limiter checks on private networks.
    Backend has no /actuator/health today. The supplied hook uses host nsenter/curl inside service network namespaces,
    verifies backend database status, gateway health and routed API success, and
    has a 45-second retry deadline (agent outer timeout 60 seconds). Private Redis
    outage/cache/rate-limit behavior still needs staging tests. No arbitrary health command enters an
    intent. Review/update the proposed unit; do not enable it before full staging.
12. Set root-owned operator policy enabled only after all guards, signature/provenance
    verification and staged failure tests succeed. Exact immutable Blob name is an
    operator approval pointer; no list-latest, unattended watch or timer is installed.
    VM fetches using MI, validates source and digests, locks deployment, checks UUID,
    existing service, secret/backup/plan evidence, verifies GitHub attestations tied
    to commit/workflow, pulls exact digests and updates only backend/gateway.

## GitHub OWNER ACTION REQUIRED

Protect main with PR reviews, no direct pushes/force pushes, required CI/security
checks, no accidental auto-merge, and dismissal of stale approvals. Require owner
review for workflow/infra changes. Recommend CODEOWNERS entries for `.github/` and
`infra/` through the repository's normal policy process; no policy file was edited.
Restrict Actions allowlists, fork token permissions and runner use. Create both
Environments explicitly, main-only deployment branches, required reviewers and
prevent self-review. Do not set production variables in fork PR jobs. Confirm
artifact attestations are supported by repository plan/visibility; publication
fails if attestation fails rather than silently downgrading provenance. Private
repository VM verification may require an approved short-lived GitHub App token.
Configure notification/retention and verify first PR and main runs before requiring
new statuses. Do not dispatch a promotion until trusted publish and approvals pass.

## Operating and rollback

Review exact source/scans/SBOM/candidate in the trusted build run. Dispatch promotion
on main with that run ID. After approval, review the new immutable intent Blob;
set the VM's protected approved_blob pointer through existing operator change
control. Run the proposed oneshot only after installation/review. It does not
install itself or poll latest. Monitor journald and root-protected current/previous
state; subprocess output is suppressed to avoid leaking credentials. Failures stop
rollout; investigate protected logs without printing secrets.

Rollback is application-only, never schema rollback. Automatic fallback requires
both candidate rollback_safe (publisher Environment variable
MIGRATION_BACKWARD_COMPATIBLE=true after per-release review) and commit-bound local
migration approval rollback_safe=true. Otherwise failed health stops and raises an
operator incident. Previous pair must still pass manifest expiry/repository checks.
Older expired candidates need a newly approved compatible release; do not edit
history to bypass expiry. Filesystem state records are replaced only after successful
health. Existing database state is never recreated. Staging tests are mandatory
before activating this prepared agent; no end-to-end production success is claimed.

## Verification / first safe CI

```bash
python3 -m venv infra/validation/.venv
infra/validation/.venv/bin/pip install -r infra/ci/requirements.lock
python3 infra/ci/bootstrap.py
infra/validation/.venv/bin/python3 infra/ci/verify.py
python3 -m unittest discover -s infra/tests -v
PATH="$PWD/infra/validation/bin:$PWD/infra/validation/.venv/bin:$PATH" sh infra/ci/security.sh
sh infra/ci/images.sh
```

After owner review, commit/push/PR manually; the first safe test is a PR to main,
including a fork test with no production variables. Observe all PR gate jobs.
Only after Azure/Environment setup should the owner merge and test main publication.
No command in this preparation dispatches workflows, changes settings or deploys.

## Local result / activation boundary

See `../validation/CI-CD.md` for this run's actual results and `FILES.md` for the
complete affected-path inventory. Application source/configuration and existing
root documentation remain unchanged. Existing legacy CI was only hardened, not
removed. No commit/push, GitHub settings change, Azure resource operation, live
intent publication, systemd installation, or production database access occurred.

OWNER ACTION REQUIRED: security scans must finish successfully before publication.
Local full-image analysis hit a GHCR Java-index stream PROTOCOL_ERROR and failed
closed; this is not a vulnerability waiver. The final scanner driver aggregates
failures across both image scans rather than allowing the first failing scan to
skip the second. The earlier local attempt stopped before the gateway analysis;
the final driver itself still needs a complete GitHub run. Local unit/lint/build
success is not an end-to-end CI/CD or production acceptance test.

Mandatory VM network prerequisite: restrict application containers' access to the
Azure IMDS endpoint (169.254.169.254) through reviewed host/network controls. Only
the protected host agent should acquire the VM's identity tokens. No host firewall
or Azure networking policy was changed here; confirm this before enabling ingress.

**Current release blockers:** the completed dependency scan reports 6 CRITICAL and
12 HIGH findings in bun.lock (development dependencies included). Frontend owners
must remediate in a separate approved application change. Full Java image scanning
failed on a GHCR PROTOCOL_ERROR while downloading its index. Neither failure was
waived; publishing remains gated. Consult validation/CI-CD.md before activation.
