# Runtime APT security update — 2026-11-11

PR #46's November 10 container gate reported HIGH CVE-2026-109518 in apt and
libapt-pkg6.0 2.4.14 in both application images. Ubuntu Jammy fixes this in
2.4.15ubuntu0.1: https://ubuntu.com/security/CVE-2026-109518.

The official eclipse-temurin:21-jre-jammy tag still resolved to the existing
sha256:1eac8b8fee11ca7d6725a48bc5d41992ed1561504ebae25490d2d062847e8269
index when checked. Refreshing that tag would therefore not fix the finding.
Both runtime stages retain the verified Java 21 digest and explicitly install
apt/libapt-pkg6.0 at APT_SECURITY_VERSION=2.4.15ubuntu0.1. Package version checks
fail the build below the vendor fix. APT Acquire::Retries=0 disables the vulnerable
retry behavior during update/bootstrap; package authentication is retained.
Package lists are removed in the same layer. No ignore rules or severity changes.

Only the two infrastructure Dockerfiles and this record change. Application code,
Maven/frontend dependencies, SQL, Compose, production VM and volumes are untouched.
The extra runtime layer adds package-network availability as a build dependency;
missing pinned package versions fail closed. Override versions only after vendor
review and rescanning. Once a refreshed official image includes the fix, review
its digest and retire the temporary package layer as a separate verified update.

Validation commands from the repository root:

```sh
hadolint infra/docker/backend.Dockerfile infra/docker/gateway.Dockerfile
sh infra/ci/images.sh
python3 infra/ci/runtime_smoke.py
```

The runtime smoke uses disposable MySQL/Redis and previously packaged application
archives; image-specific checks verify non-root, read-only JRE execution. Production
release still requires hosted CI and approval. Reverting this fix restores a known
vulnerability; do not treat that as an approved production rollback.

## Executed verification

Both final Dockerfiles built successfully and both final images contain apt and
libapt-pkg6.0 exactly 2.4.15ubuntu0.1. Hadolint and whitespace checks pass.
Both final images passed full Trivy 0.76.1 OS/Java/secret scans: zero HIGH,
zero CRITICAL and zero secret findings (143 OS packages each; 99 backend / 104
gateway Java package records). CycloneDX SBOMs were generated. Non-root,
read-only offline runtime checks and the isolated application smoke passed.

Local scans reused read-only databases freshly downloaded on November 11 with
in-memory analysis caches and offline analysis: vulnerability DB updated
November 10 19:01 UTC, Java DB updated November 11 01:07 UTC. The initial driver
was stopped to avoid its redundant second index download; both final images were
then explicitly saved and scanned with exit-code gating and complete report
checks. CI's fresh-database scan script remains unchanged. Generated reports,
SBOMs, logs and archives are ignored under infra/validation. Hosted CI and any
registry/production rollout have not been performed for this change.
