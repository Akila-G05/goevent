# CI/CD implementation validation — 2026-11-01

## Implemented; not cloud-activated

Three trust stages, pinned action references, hash-checked tooling, serialized
image scanning with isolated caches, CycloneDX inventory/provenance publication,
strict candidate/intent policy, private Blob delivery adapter disabled by default,
application-only Compose, guarded VM pull/health/rollback preparation and owner
handoff. No Azure/GitHub settings, publication, deployment or production database
operation was executed. Nothing was committed or pushed.

## Locally tested

- Read-only tracked files outside authorized workflow paths unchanged (SHA256
  snapshot); all generated/test copies remain under infra/validation.
- Backend copied-source `mvn -B -ntp -Dmaven.compiler.release=21 ... clean verify`:
  **7 tests passed**, WAR packaged successfully; isolated MySQL 8.4 Testcontainers.
- Gateway copied-source Maven verify: executable JAR build passed; no gateway test
  sources exist, so this does not prove Spring Cloud/Redis runtime compatibility.
- Frontend copied-source frozen Bun install, typecheck, lint, Vitest and Next build
  completed successfully. Production credentials were not supplied.
- Both container builds passed, including final WORKDIR-based Dockerfile lint fix.
  Non-root offline JRE smoke checks passed; no application was connected to a DB.
- **14 policy/failure tests passed**: mutable/invalid/wrong-repository digests,
  expiry/security failure, untrusted PR run, missing OIDC, missing/wrong disk,
  missing secret inventory/file, concurrency lock, unapproved reviewers, invalid
  manifest with zero execution, incomplete scan, and failed health without success
  state. These are isolated mocks/fixtures, not production rollout tests.
- YAML parsing, Python AST parsing, JSON Schema definition validation, application
  Compose rendering, protected-file checks passed (`infra/ci/verify.py`).
- actionlint 1.7.12, zizmor 1.31.1 regular/offline audit, ShellCheck 0.11.0,
  hadolint 2.15.1 passed. No warning/ignore thresholds were weakened.
- Gitleaks 8.30.1 scanned 38 commits: no leaks found, report redacted.
- Semgrep 1.183.0: two local baseline rules, 24 source targets, zero findings.
  This is deliberately limited SAST coverage, not a comprehensive security claim.
- Python pinned/transitive hash-lock installation dry-run passed on local Python;
  GitHub Python 3.13 installation still needs a real hosted run.
- Offline Trivy 0.76.1 OS-only scan of rebuilt backend image, Ubuntu 22.04 / 143
  packages: no HIGH/CRITICAL findings. It does not establish Java library safety.

## Blocking results (not waived)

Trivy frontend dependency scan, using fresh 2026-11-01 vulnerability DB, with
development dependencies included:

| Manifest | CRITICAL | HIGH |
| --- | ---: | ---: |
| bun.lock (approved frontend lock) | 6 | 12 |
| package-lock.json (also present, not used for installation) | 6 | 13 |

These are scanner findings, including overlapping advisories and repeated packages
across locks, not a count of independently proven exploits. Developer-owned
frontend remediation is required. No package or lockfile was edited. The CI gate
must fail until resolved or a separately reviewed narrow/time-limited exception
is approved; no exception/suppression was implemented here.

Full backend image OS/JAR scan failed while downloading the 947 MB Java database:
GHCR returned HTTP/2 `PROTOCOL_ERROR` at about 73% of the Java index. The incomplete
JSON report was rejected and the local driver returned failure. The gateway full
scan did not run after that initial driver failure. The final driver was improved
to aggregate both image failures and redact private raw reports before publishing,
but still requires a complete hosted execution. No clean Java/image-secret verdict
exists for either release image. Cached OS-only and frontend dependency checks do
not bypass this blocker. Final scripts retain HIGH/CRITICAL, secret and scanner
failure enforcement without ignore-unfixed or continue-on-error.

## Needs GitHub validation

Fork PR permission behavior, artifact upload/download, protected-main checks,
production reviewer policy API access, environment enforcement, OIDC, ACR
publication, artifact attestations, complete online scanners, final report/SBOM
conversion and promotion provenance all require actual hosted workflow runs.
No workflow was dispatched during implementation. Repository plan/attestation
availability and API permissions must be checked by the owner; failures block.

## Needs Azure and production/staging testing

Architect approval/provisioning of private Blob release channel; exact ACR and
OIDC/RBAC configuration; VM managed identity access; existing protected disk UUID;
root secret staging; network aliases; Caddy/DNS/TLS; approved Redis configuration;
production schema history/baseline review on a restored copy; encrypted backup and
restore evidence; health-hook runtime; agent rollback and systemd integration.
No live production acceptance is claimed. Unit tests do not replace an isolated
staging drill with failed pulls, Redis outage, migration failure, failed health,
expired credentials, missing disk and rollback compatibility scenarios.

Complete scope/inventory: ../docs/FILES.md. Operator procedures and activation
checklists: ../docs/IMPLEMENTATION.md. Local ignored logs/JSON contain evidence;
do not commit caches, binaries, work copies, secret staging or raw scanner output.
