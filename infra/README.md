# GoEvent containerization preparation

**Updated scope:** the subsequent master directive authorizes repository CI/CD.
See [implementation and operator handoff](docs/IMPLEMENTATION.md) for the new
workflows and proposed deployment agent. Historical preparation notes below do not
supersede that guide.

This directory is isolated infrastructure preparation, not an approved deployment.
Existing application files, root Compose, documentation and workflows are read-only.
The Dockerfiles build backend and gateway independently from their own directories;
the Next.js frontend remains on Vercel. No Azure resource, disk, secret, CI workflow,
or production runtime is created or changed here.

## Local image builds

Run from the repository root, using Docker with BuildKit and Java 21 base images:

```bash
docker build -f infra/docker/backend.Dockerfile -t goevent-backend:dev ./backend
docker build -f infra/docker/gateway.Dockerfile -t goevent-gateway:dev ./gateway
```

`COPY pom.xml` and `COPY src/main/` refer to the application build context, not the
repository root. Keep each adjacent `*.Dockerfile.dockerignore` in place: Docker
uses this Dockerfile-specific allowlist even though the Dockerfile is outside the
context. It excludes local `.env`, database models, build artifacts, logs, tests,
and unrelated files. Secret files/keys inside the source allowlist are also excluded;
source/resources must still be scanned for embedded credentials before building.
No application `.dockerignore` or source changes are required.

Both builds compile/package in a Maven 3.9.9 / Temurin Java 21 builder and copy only
the executable archive to a separate Java 21 JRE runtime. The base image references
are digest-pinned. Build arguments `MAVEN_IMAGE` and `JAVA_IMAGE` permit reviewed
base refreshes; release overrides must also use approved digests. Refresh/scanning
is required even for pinned images: immutability is not a vulnerability guarantee.

The current backend POM produces `goevent-1.0-SNAPSHOT.war` without declaring the
Boot plugin. Its Dockerfile invokes the exact Spring Boot 3.5.7 `repackage` goal
**after** `package` in the builder. It verifies `WarLauncher` and the existing main
class in the manifest. This does not change the POM or turn the backend into a
separate application. Gateway already declares the Boot plugin and packages an
executable `gateway-1.0-SNAPSHOT.jar`; its launcher/main class is also checked.
If artifact names or packaging change, update/review infrastructure accordingly.

The inherited Boot parent currently selects compiler release 17 even though both
POMs declare source/target 21. The container builds explicitly set
`-Dmaven.compiler.release=21` using the Java 21 toolchain; no POM is edited. Owners
should reconcile the non-container compiler configuration separately.

Tests are intentionally not executed during image packaging (`maven.test.skip`);
source tests are not sent to the build. This neither removes nor bypasses release
quality gates: CI must run tests, migration validation and scans in isolated jobs
before approving an image. The current backend tests require Docker. Never mount
the host Docker socket inside an application image build or point tests at the VM
database. Maven writes only inside Docker build stages/cache, not application
working trees. No secrets, database, Redis, or Azure login is needed for packaging.

## Runtime contract

| Image | Archive / process | UID:GID | Default internal port | Dependencies |
| --- | --- | --- | --- | --- |
| Backend | `java -jar /app/app.war` | `10001:10001` | 8081, context `/goevent` | MySQL 8.4; approved Flyway migration path |
| Gateway | `java -jar /app/app.jar` | `10001:10001` | 8080 | backend routes and Redis rate limiter/response cache |

Archives are root-owned and read-only; `/app/logs` is owned by the unprivileged
user for the existing file logging defaults. There is no root entrypoint script,
Docker socket, Maven, compiler, or source checkout in the runtime stage. Exec-form
entrypoints let Java receive termination signals and accept standard Spring
command-line options. They do not interpret a custom `JAVA_OPTS` string; standard
JVM `JAVA_TOOL_OPTIONS` is available, but secrets must not be put there.

Future Compose should set `read_only: true`, `cap_drop: [ALL]`,
`security_opt: [no-new-privileges:true]`, memory/CPU limits and a bounded `/tmp`
tmpfs. Provide a suitably owned writable log mount at `/app/logs` or a reviewed
external logging override. No Dockerfile `VOLUME` creates anonymous data storage.
`EXPOSE` is metadata: do not publish backend, gateway, MySQL or Redis ports to the
internet. A JRE/version smoke check is not application readiness; no production
readiness endpoint or Dockerfile health check is invented here.

## Prepared deployment architecture

```text
Vercel Next.js frontend / clients
           | HTTPS
           v
Azure VM: Caddy :443 (and :80 for redirect/ACME as approved)
           | private ingress network
           v
        gateway:8080 ---- Redis:6379 (private application network)
           |
        backend:8081 (private application network)
           | private database network
        MySQL 8.4 -> existing protected Azure Managed Disk

VM host Managed Identity -> Key Vault secrets / ACR pull
GitHub Actions OIDC -> build, scan, attest and approve immutable image digests
VM pull agent -> verify an approved release, then pull its exact ACR digests
```

Service names above describe the future DNS contract; no Compose stack is created
or started here. Container `localhost` means that container, not another service.
Caddy and gateway share an ingress network; gateway/backend/Redis share a private
application network; backend/MySQL share a private data network. Restrict egress
and avoid giving public ingress containers access to database mounts or the VM
identity endpoint. Only the host secret/pull agent should use VM Managed Identity.
Use appropriate private network settings while retaining any explicitly approved
external payment/email egress. Never use host networking to conceal localhost
configuration problems.

Caddy remains the HTTPS reverse proxy and owns certificate renewal/storage under
the existing approved policy. Forward only the agreed API paths to gateway,
preserving `/goevent/api/...` unless owners approve another contract. Do not expose
Actuator or direct backend routes through Caddy. Hostnames, TLS/DNS validation,
forwarded-header trust and certificate storage still need reviewed deployment
configuration; an internet-ready Caddyfile is deliberately not guessed.

### Secrets and external configuration

The existing applications do not integrate directly with Key Vault. An approved
VM host process should use Managed Identity and least-privilege Key Vault access
to fetch explicitly versioned secrets into a restricted ephemeral directory (for
example an approved tmpfs). Mount each service's required files read-only, with
ownership readable by UID 10001; do not share all secrets across services. Avoid
logging secret values, command-line passwords, or committing generated secret
files. Root/Docker administrators can inspect containers; file injection does not
remove the need to protect the host.

Spring Boot supports a required config tree import through runtime configuration:
`SPRING_CONFIG_IMPORT=configtree:/run/secrets/`. Do not prefix this deployment
secret import with `optional:`; missing secrets should fail closed. File names are
property keys: e.g. `spring.datasource.url`, `spring.datasource.username`, and
`spring.datasource.password`. An external production JDBC URL must replace the
packaged local URL that disables TLS and allows public-key retrieval. Confirm
MySQL server certificate/trust provisioning and the service DNS name before
choosing `sslMode=VERIFY_IDENTITY`. Do not assume the local JDBC defaults meet the
production connection policy. Config-tree properties can supply the deployment
values without copying `.env` into an image. Verify effective configuration in
isolated staging with sanitized output before release.

Migration credentials, where used, are distinct `spring.flyway.url`,
`spring.flyway.user`, and `spring.flyway.password` properties. Keep runtime data
access least-privileged. Never give the backend the MySQL root password. Redis
credentials should be injected only into gateway and Redis, with agreed TLS/ACL
settings; changing secret files alone does not rotate existing database or Redis
credentials. Atomic secret refresh, expiry, restart and rotation procedures require
operator review. No credentials are fetched by this preparation.

Use a separate read-only external config directory with
`SPRING_CONFIG_ADDITIONAL_LOCATION=file:/run/config/` for nonsecret service
configuration. It must override all existing gateway route URIs (including the
three special test routes), Redis host, management exposure, logging and production
settings as appropriate. Preserve required route predicates/filter ordering when
owners review that configuration; replacing a list can replace every route. The
application/configuration blockers are listed in [compatibility.md](compatibility.md).

### Managed disk, backups and disaster recovery

Preserve the existing protected Azure Managed Disk and its data. This preparation
has no volume initialization, formatting, disk provisioning, restore or teardown
commands. The existing local root Compose volume is not a production disk binding.
Before an authorized deployment, verify the approved disk ID/filesystem UUID,
mounted path, expected existing data and permissions, attachment/delete protection,
and MySQL 8.4 data-directory compatibility. A deployment must fail closed when the
disk is not mounted; it must not create an empty directory on the VM OS disk.
A future explicit bind should disable automatic host-path creation and include a
mount/identity preflight; exact paths must come from verified infrastructure.

Do not use `docker compose down -v`, initialize an empty volume, format, or replace
the protected disk as part of an image release. Do not repeat earlier local test
volume resets against the VM. Preserve the existing encrypted backup and disaster
recovery safeguards: authorized backup/snapshot coverage, separate recovery-key
access, retention, protected copies, and a verified isolated restore before risky
migrations. Actual policies, job definitions, RPO/RTO and restore evidence are not
in this checkout and must be supplied by operators. Do not replace them with new
untested jobs or claim backup success based on an image build. Database rollback
requires a data recovery plan; pulling an older image does not reverse schema DDL.

### Approved pull-based releases (future work, no workflow edits)

1. GitHub protected branches/reviews and protected release environments gate the
   build. Run application and MySQL migration tests, secret detection, Dockerfile
   lint, dependency/license and image OS/JAR vulnerability scans. Generate SBOMs
   and signed provenance bound to the tested image digests. Scanner failures and
   exceptions require documented review; builds alone are not a security approval.
2. Authenticate GitHub Actions to Azure using narrowly scoped OIDC federation
   tied to the approved repository/ref/environment. Use least-privilege registry
   publishing permissions and pinned action revisions; no static Azure password,
   VM SSH push deployment, or registry admin credential. Pin deployment tooling
   and third-party image digests (Caddy/MySQL/Redis) in the later approved stack.
3. Build once from the reviewed source revision, scan/sign the resulting images,
   and publish to ACR. Record backend and gateway `repository@sha256:...`, source
   revision, platform, SBOM/provenance and approval in a versioned release manifest.
   The current project `SNAPSHOT` names are not release identifiers. No rebuilding
   from source or resolution of `latest`/mutable tags is allowed on the VM.
4. A host pull agent uses VM Managed Identity with registry pull-only permissions
   (role depends on registry authorization mode). It fetches only an explicitly
   approved release manifest, verifies signatures/provenance/scans and approved
   digests, checks disk/backup/config preconditions, then pulls those exact ACR
   digests. Polling for an approval is not permission to track a moving image tag.
   No autonomous image updater is introduced.
5. Serialize deployments and migration ownership. Check dependencies/readiness,
   keep public ingress closed until the approved checks pass, and record rollout
   evidence. A prior approved digest set is a possible application rollback only
   after schema compatibility is established. GitHub deployment approval, VM
   approval transport, trust keys and operational runbooks are still blockers.

No ACR image was published and no OIDC federation, Key Vault policy, disk mapping,
Caddy service, pull agent, backup job or workflow was configured in this task.

## Review scope and validation

Impact is confined to new infrastructure files. Images package existing byte-for-byte
application sources; the backend's build-time launcher step adapts WAR packaging and the container builds
explicitly target Java 21. Runtime configuration and dependency readiness remain operator/owner
responsibilities. No API, schema migration, business logic or frontend code changes
are included. Removing these new files/local test image tags rolls back preparation;
there is no production rollback operation to execute.

See [compatibility findings](compatibility.md) and [local validation](validation/README.md)
for unresolved application requirements and the actual build/security results.

References: [Spring Boot executable archives](https://docs.spring.io/spring-boot/3.5/maven-plugin/packaging.html),
[Docker build context and Dockerfile-specific ignore files](https://docs.docker.com/build/concepts/context/),
[Key Vault authentication](https://learn.microsoft.com/en-us/azure/key-vault/general/authentication),
[ACR Managed Identity authentication](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication-managed-identity).
