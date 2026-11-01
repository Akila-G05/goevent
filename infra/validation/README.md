# Local validation — 2026-11-01

Scope: new infrastructure files only, from repository root, on
`vinura/prepare-container-infrastructure`. No application source/configuration,
root Compose, existing documentation or workflow was edited. Before/after SHA-256
comparison of all 61 tracked files found no changes. No commit, push, deployment,
Azure call, database connection or managed-disk/database-volume operation was performed.

## Build results

Both exact application-directory contexts built successfully on local linux/amd64:

```bash
docker build -f infra/docker/backend.Dockerfile -t goevent-backend:infra-check ./backend
docker build -f infra/docker/gateway.Dockerfile -t goevent-gateway:infra-check ./gateway
```

| Image | Local image ID | Result |
| --- | --- | --- |
| `goevent-backend:infra-check` | `sha256:9f7b7bd2cdc8cf30141ed6e25e020090f598a25a29ac4f279a7583da040d9907` | Maven package + Boot 3.5.7 repackage; WAR manifest verified |
| `goevent-gateway:infra-check` | `sha256:11a71962675bd378ea33e880c1a3b4ae15138d7d5148e206e86cf45319e377bb` | Existing Boot plugin packages JAR; manifest verified |

These are local test images, not approved/published ACR release artifacts. Both
build logs confirm `release 21`. Independently inspected packaged main classes
have class-file major version 65 (Java 21); Boot launchers and existing application
main classes are present. Neither archive has `.env` entries. The backend includes
its existing Flyway migration resources without running migrations.

An initial packaging pass revealed inherited compiler release 17 and was cancelled;
final Dockerfiles explicitly set `maven.compiler.release=21` and final builds pass.
Tests are skipped only for packaging, as documented in `../README.md`. No unit,
Testcontainers, application startup, Redis integration, migration, HTTP, or Azure
runtime test was run in this infrastructure-only task.

## Checks actually performed

- `docker build --check` for both final Dockerfiles: passed, no warnings.
- `sh -n infra/validate-images.sh`: passed.
- `infra/validate-images.sh`: passed for both images. It overrides the entrypoint
  and runs only permission/tool/JRE checks with **network none**, read-only root,
  no added capabilities, no-new-privileges and bounded temporary/log filesystems.
  It does not execute application code.
- Both images use UID:GID 10001:10001; archives and `/app` are not writable by the
  runtime user; the explicit log mount is writable. Runtime has neither Maven nor
  `javac`. `java -version` reports Temurin 21.0.13.
- Image configuration inspection found no credential environment keys.
- Trivy 0.76.1 Dockerfile configuration scan: two files detected, 20 successful
  checks per file, no HIGH/CRITICAL misconfiguration findings. The scan command
  used `--severity HIGH,CRITICAL --exit-code 1`; this says nothing about omitted
  lower severities or application security.
- Trivy secret scan of the read-only `backend/src/main`, `gateway/src/main`, and
  `infra/docker` mounts: no secret findings. This is scoped detection, not a proof
  that every credential is absent. Local `.env` was not mounted/scanned/copied.
- Base images were resolved from official image registry metadata and pinned by
  index digest in both Dockerfiles. Their publisher signatures were not verified.
- Read-only tracked-file fingerprint comparison and Git status: unchanged existing
  files, only new `infra/` files. New-file whitespace checks also passed.

The scanner container itself was pinned to
`aquasec/trivy@sha256:790fd66d1697395d8693d1acaa1ea702406a20f109b6fc7bac8db623eca6c06c`.
It received only explicit read-only scan targets and a writable local cache beneath
`infra/validation/`; it did not receive a Docker socket, Azure credentials or the
repository `.env`.

## Incomplete security validation — release blocker

Full OS/JAR vulnerability and image-secret scanning has **no completed verdict**.
The first gateway attempt was interrupted during a slow database download from
the default mirror. Retrying against the documented GHCR database source retrieved
the vulnerability DB (metadata updated 2026-11-01), but the image scan still did not
complete during bounded local validation and was stopped. A backend attempt made
while that cache was occupied failed with an explicit cache-in-use timeout. These
outcomes are not clean vulnerability scans; no vulnerability waiver is implied.
The temporary scanner container was stopped; no scan is left running.

Rerun image scans **sequentially**, with sufficient database download/analysis time
and an approved fresh vulnerability/Java database cache, before release. Scan both
OS packages and Java dependencies, investigate HIGH/CRITICAL findings, generate
SBOM/provenance and enforce the protected approval policy. Do not publish/deploy
these local tags based only on successful packaging/static checks. This task does
not resolve application vulnerabilities or modify app dependencies.

Local build logs, scanner JSON/log output, extracted archives, saved image tar and
scanner cache are ignored by `infra/.gitignore`; do not upload these as release
evidence without reviewing them. Local images remain for review. Compatibility,
production networking, secrets, protected disk/backup safeguards and rollout
blockers are tracked in `../compatibility.md` and `../README.md`.
