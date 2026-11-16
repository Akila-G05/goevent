# Application runtime bootstrap — owner handoff

## Boundary and blast radius

High-risk secret/TLS integration: `deploy/bootstrap.py` fetches explicitly pinned
Key Vault versions using **host** Managed Identity, validates them in a private
`/run` temporary directory, builds a PKCS12 CA truststore and renders the existing
Redis ACL template. Only `/run/goevent/{backend,gateway,redis}` is written. Files
are root:10001 0640; directories root:10001 0750. Existing values are never
replaced, symlinks/unsafe ancestors are rejected, and a failed publication removes
only files/directories created by that invocation. A private flock serializes
bootstrap. No container, MySQL user, TLS listener, release pointer, approval,
backup evidence, Azure resource or protected MySQL file is created/changed.

The source/target inventory is exactly the **16** entries in
`deploy/operator-policy.example.json`. The owner reports four existing MySQL
password files under `/run/goevent/secrets` and `/run/goevent/mysql-secrets`;
none establishes that any of the 16 application files exists. This checkout has
not accessed the VM. `--check` reports missing/unsafe paths without values or hashes.
It checks file metadata, not live TLS, account existence or database grants.

The helper does not read a MySQL root password. Explicit
`reuse_protected_app_password=true` permits read-only reuse of **both**
`/run/goevent/secrets/mysql_app_password` and
`/run/goevent/mysql-secrets/mysql_app_password`. Both must be root-only regular
files, without symlinks/unsafe ancestors, and contain identical bytes. Confirm the
existing bootstrap owner permits this use before opting in; do not chmod or edit
those files to satisfy this helper. Otherwise use the matching app password from
the approved Key Vault version. Whitespace/newline-containing password files are
rejected rather than silently trimming or changing credentials.

Rollback: keep release policy `enabled=false` and Blob delivery disabled. On
bootstrap failure existing files are retained. Before rotation, stop dependencies
and applications using the existing reviewed procedure, separately approve and
remove/archive **only application runtime directories**, then bootstrap again.
Never delete the protected MySQL directories or print secret contents. Completed
bootstrap uses `--check`; regeneration of a PKCS12 truststore has random salts and
is intentionally not an automatic rotation. `/run` is ephemeral: invoke bootstrap
after the existing MySQL bootstrap on each reboot, before dependency/app startup.
The proposed oneshot has no `[Install]`; this work installs/enables nothing.

## Owner prerequisites — verify rather than assume

1. Verify VM identity, actual Key Vault name/network access and scoped secret-get
   rights. Prefer a dedicated application-secret vault or approved per-secret
   scope; no vault management/secret-write role is required by the VM helper.
   Keep container access to IMDS denied. The CLI cache is private and temporary,
   separate from existing MySQL Azure CLI state; no client secret is used.
2. Review existing `goevent.service`, `/opt/goevent/compose.yml` and the four protected
   files with their owner. Preserve MySQL startup, mounts, network and root secrets.
   Verify GID 10001 is reserved and has no human members.
3. Install/review Python 3, Azure CLI supporting `az login --identity --client-id`,
   OpenSSL 3, Java keytool with `-storepass:file`, Docker CLI and systemd. No package
   installation is performed by this repository. All commands below are owner
   instructions, not operations performed by the coding agent.
4. Actual MySQL server TLS and a distinct `goevent_migration` account are **not
   established by this helper**. Complete the review below before setting
   `mysql_tls_and_grants_reviewed=true`. A certificate obtained from Key Vault can
   be validated locally without proving the live server serves that certificate.

## Issue service certificates (approved CA workstation, not the VM)

Use an existing approved private CA where available. The following is an isolated
example issuance procedure, not an instruction to replace an existing trust root.
Use a restricted encrypted workstation volume. Keep the CA private key offline;
never give it to Key Vault runtime secrets or the VM. PEM examples use one root CA
and directly signed service leaves; introduce intermediates only with a separately
reviewed chain format and tests. Key Vault secret values have size limits.

```sh
umask 077
mkdir goevent-cert-review
cd goevent-cert-review
openssl rand -hex 32 > ca-pass
openssl req -x509 -newkey rsa:3072 -keyout ca.key -out ca.crt \
  -passout file:ca-pass -days 3650 -subj '/CN=GoEvent private service CA' \
  -addext 'basicConstraints=critical,CA:TRUE' \
  -addext 'keyUsage=critical,keyCertSign,cRLSign'
for service in mysql redis; do
  openssl req -new -newkey rsa:3072 -nodes -keyout "$service.key" \
    -out "$service.csr" -subj "/CN=$service" \
    -addext "subjectAltName=DNS:$service" \
    -addext 'basicConstraints=critical,CA:FALSE' \
    -addext 'keyUsage=critical,digitalSignature,keyEncipherment' \
    -addext 'extendedKeyUsage=serverAuth'
  openssl x509 -req -in "$service.csr" -CA ca.crt -CAkey ca.key \
    -passin file:ca-pass -CAcreateserial -out "$service.crt" \
    -days 90 -copy_extensions copy
  openssl verify -CAfile ca.crt -purpose sslserver \
    -verify_hostname "$service" "$service.crt"
done
```

The helper rejects leaves/CAs expiring in less than seven days, missing exact DNS
SAN, invalid chain/server purpose, or mismatched Redis key. Establish renewal and
expiry monitoring; rotation is coordinated downtime, not an unattended hot swap.
Only Redis server key is retrieved by the application helper. Deliver MySQL's
server key/certificate through its **existing separately reviewed owner mechanism**.

## MySQL server TLS and account review (separate owner change)

For the owner-verified empty Azure database, use the staged
[MySQL TLS and privilege migration plan](MYSQL-TLS-MIGRATION.md), which adds
backup, certificate mount, client acceptance and rollback gates before activation.

Use the existing authorized administrative connection, never a root password on a
command line, terminal dump or new application config. First inspect:

```sql
SHOW VARIABLES WHERE Variable_name IN
 ('ssl_ca','ssl_cert','ssl_key','tls_version','require_secure_transport');
SELECT user,host,ssl_type,account_locked FROM mysql.user
 WHERE user IN ('goevent_app','goevent_migration');
```

Review the actual server certificate/key mounts and certificate SAN `DNS:mysql`.
A self-generated MySQL certificate with another identity does not meet this
contract. The MySQL owner must approve mapping existing server `ssl_ca`, `ssl_cert`
and `ssl_key` to the reviewed files and enabling TLSv1.2/TLSv1.3; evaluate
`require_secure_transport=ON` against **all** existing consumers/health/bootstrap
connections before any change. Reload TLS or restart only through that owner's
approved procedure. This repository supplies no protected Compose replacement,
server restart command or assumption about the root-secret container mount path.
See [MySQL TLS configuration](https://dev.mysql.com/doc/refman/8.4/en/using-encrypted-connections.html).

For each **actual reviewed host selector**, inspect `SHOW GRANTS FOR ...` and
`SHOW CREATE USER ...` in the protected admin session (the latter may expose an
authentication verifier: do not capture/share output). Review existing grants first.
Runtime `goevent_app` needs SELECT/INSERT/UPDATE/DELETE on `goevent_db.*`, not DDL,
GRANT OPTION or global privileges. This helper neither revokes existing privileges
nor changes its password. Apply `REQUIRE SSL` only after existing consumers work.

The migration account may be absent. Create it with a **different**, approved
password and suitable host selector; do not use `CREATE USER IF NOT EXISTS` to hide
an unknown existing account. Review Flyway V1–V5: the current migration baseline
needs SELECT/INSERT/UPDATE/DELETE, CREATE, ALTER, INDEX and REFERENCES on
`goevent_db.*`. No global CREATE USER/FILE/SUPER or GRANT OPTION is required.
Current V5 DROP INDEX runs through ALTER TABLE; it does not justify a blanket
DROP TABLE privilege. Do not grant DROP for clean/repair; clean stays disabled.
Review any future migration requiring additional privileges separately. Limit host access and credential exposure; server-side REQUIRE SSL does not itself
verify server identity. JDBC VERIFY_IDENTITY and the reviewed CA do that.

After generating the password files in the next section, prepare account SQL
in a root/private file on the admin workstation using the
password file (no terminal paste/command-line secret):

```sh
# Run in the protected secret workstation directory; choose the actual host selector.
python3 - <<'PY'
from pathlib import Path
import re
host = input('Reviewed MySQL migration host selector: ')
if not re.fullmatch(r'[A-Za-z0-9.%_:/-]{1,255}', host):
    raise SystemExit('Invalid host selector')
p = Path('goevent-mysql-migration-password').read_text()
if not re.fullmatch(r'[0-9a-f]{64}', p):
    raise SystemExit('Expected generated hex password file')
account = "'goevent_migration'@'" + host + "'"
sql = "CREATE USER " + account + " IDENTIFIED BY '" + p + "' REQUIRE SSL;\n"
sql += 'GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON `goevent_db`.* TO ' + account + ';\n'
path = Path('migration-account.sql')
with path.open('x') as target:
    target.write(sql)
path.chmod(0o600)
PY
```

Execute that file only using the existing authorized administrative tool/session,
with history disabled and SQL audit/log handling reviewed. For an existing account,
review a separate ALTER USER/rotation plan rather than executing CREATE USER.
A protected defaults-extra-file or existing admin secret mechanism supplies root
credentials; its actual container path is owner-specific and must not be invented.
Delete protected temporary SQL after the approved account change. Do not store it
in Git or CI. Verify runtime and migration logins independently from an approved
client on the existing MySQL network with `--ssl-mode=VERIFY_IDENTITY`,
`--ssl-ca=REVIEWED_CA_FILE`, host `mysql`, and protected client credential files:

```sql
SELECT CURRENT_USER();
SHOW SESSION STATUS LIKE 'Ssl_cipher';
SHOW GRANTS;
```

Do not run migrations during bootstrap. The existing release still requires real
backup/restore evidence and commit-bound migration approval before backend startup.

## Key Vault values and pinned version inventory

The bootstrap example is disabled. Choose actual names/vault/version IDs; example
secret names below are an exact convention the helper example maps to. Generate
five **distinct** new random passwords; reuse the existing app password only when
approved, or retrieve its existing approved version without rotating it.

```sh
# Protected workstation directory; no shell tracing, no value arguments, no output dumps.
umask 077
for name in mysql-migration-password mysql-truststore-password redis-backend-password redis-gateway-password redis-health-password; do
  openssl rand -hex 32 | tr -d '\n' > "goevent-$name"
done
: "${VAULT:?owner-verified vault name required}"
for name in mysql-migration-password mysql-truststore-password redis-backend-password redis-gateway-password redis-health-password; do
  az keyvault secret set --vault-name "$VAULT" --name "goevent-$name" \
    --file "goevent-$name" --encoding utf-8 --query id --output tsv --only-show-errors
done
for pair in 'mysql-ca:ca.crt' 'mysql-server-cert:mysql.crt' 'redis-ca:ca.crt' 'redis-server-cert:redis.crt' 'redis-server-key:redis.key'; do
  name=${pair%%:*}; file=${pair#*:}
  az keyvault secret set --vault-name "$VAULT" --name "goevent-$name" \
    --file "$file" --encoding utf-8 --query id --output tsv --only-show-errors
done
```

These commands create Key Vault versions and are **owner-only future actions**.
Returned IDs are non-secret configuration; record their exact versions in
`secret_ids`. Never run `secret show --query value` to the terminal. The new
migration password must be the same value used in the separately approved SQL.
If protected app-password reuse is approved, set `reuse_protected_app_password`
true and remove `mysql-app-password` from `secret_ids`. Otherwise map that field to
the existing matching app credential's versioned ID; do not create/rotate a
password that disagrees with MySQL. Do not upload either MySQL root password.
The CLI uses UTF-8 PEM secrets; base64/PFX values are not interchangeable here.
See [Key Vault secret CLI](https://learn.microsoft.com/en-us/cli/azure/keyvault/secret?view=azure-cli-latest).

Set public `allowed_origins` to explicit frontend HTTPS origins and
`google_client_id` to the verified OAuth audience. Set the optional client ID only
for an approved user-assigned MI; empty means the VM system-assigned MI. The helper
accepts Azure public-cloud vault endpoints only. Set both bootstrap approval flags
only after the reviews above; they do not enable operator policy or Blob delivery.

## Exact VM inspection and installation commands

Do not run these from an agent session or against production without owner review.
No SSH, cloud operation, container start or install was performed for this change.
On the VM, using a **new** reviewed inert bundle containing this change, staged by
`bundle.py` into a fresh review directory (never overwrite an older bundle), after the
existing protected MySQL bootstrap/service is already active:

```sh
BUNDLE=/opt/goevent/releases/review-bootstrap-01
sudo systemctl is-active goevent.service
# Non-secret metadata only; neither root password file is read.
sudo stat -c '%n %U:%G %a %F' \
  /run/goevent/secrets/mysql_app_password \
  /run/goevent/mysql-secrets/mysql_app_password
sudo python3 -B "$BUNDLE/deploy/bootstrap.py" --check
```

`--check` exits 1 when anything is missing/unsafe. Keep its list as evidence; it
cannot prove account/TLS readiness. Ensure `/run/goevent` is already root-owned,
non-symlink, and not group/world writable; do not chown the existing parent or
protected MySQL trees. Confirm application/dependency containers are stopped using
`docker ps` filters for projects goevent-app and goevent-dependencies; the helper
refuses running containers and never stops them itself.

Prepare a reviewed copy of `deploy/bootstrap.example.json` off-host, substituting
actual pinned IDs/public config and the explicit approvals. The file contains
identifiers and approvals, not plaintext secrets. Install it without overwriting
an existing bootstrap config:

```sh
sudo install -d -o root -g root -m 0700 /etc/goevent-release
sudo sh -eu -c 'test ! -e /etc/goevent-release/bootstrap.json; test ! -L /etc/goevent-release/bootstrap.json; install -o root -g root -m 0600 /path/to/reviewed/bootstrap.json /etc/goevent-release/bootstrap.json'
sudo python3 -B "$BUNDLE/deploy/bootstrap.py" --config /etc/goevent-release/bootstrap.json
sudo python3 -B "$BUNDLE/deploy/bootstrap.py" --check
```

Invoke directly from the inert bundle for initial staging. The optional proposed
`systemd/goevent-application-bootstrap.service` assumes an independently reviewed
`current` pointer already exists. Only then, if desired, the owner may install that
new unit (never modify/replace `goevent.service`), run daemon-reload and explicitly
start **only the bootstrap oneshot**. Do not enable it at boot or attach it to the
protected unit in this task. Direct invocation needs no systemd installation.
The unit uses Requisite rather than Requires, so an inactive protected service
fails the bootstrap instead of implicitly starting MySQL. Application startup
remains separate and disabled.

PKCS12 verification without disclosing its password:

```sh
sudo keytool -list -keystore /run/goevent/backend/mysql-truststore.p12 \
  -storetype PKCS12 -storepass:file /run/goevent/backend/MYSQL_TRUSTSTORE_PASSWORD
sudo openssl verify -CAfile /run/goevent/redis/redis-ca.crt \
  -purpose sslserver -verify_hostname redis /run/goevent/redis/redis.crt
sudo find /run/goevent/backend /run/goevent/gateway /run/goevent/redis \
  -maxdepth 1 -printf '%p %u:%g %m %y\n'
```

Never `cat` credential/ACL/private-key files, dump container environment, use
`set -x`, or put secrets into arguments/images/Compose environment/GitHub. Redis
CA verification does not prove a live TLS listener. Actual MySQL/Redis verified-TLS
connections, password rotation, renewal, reboot, least-privilege Key Vault denial,
backup/migration guards and runtime acceptance remain owner checks before startup.

## Repository verification

`python3 -m unittest discover -s infra/tests -v` covers disabled/invalid bootstrap
configuration, version pinning, password policy, stopped-container guard,
permissions/symlink rejection, non-overwriting staging, and generated test CA/leaf
identity plus PKCS12/ACL inventory. Tests call local OpenSSL/keytool only; Azure
commands are mocked, no containers are started, no production paths are written,
and ephemeral generated test keys are removed. Application code/Compose,
production config, 16-file inventory and existing deployment guards are unchanged.

Validation performed for this change: 42 infrastructure tests passed (including
generated certificate/truststore and failure-cleanup cases), configuration/schema
checks passed, Gitleaks found no leaks in deploy sources, and diff whitespace
checks passed. Local systemd verification cannot resolve the owner-reported
`goevent.service`, which is not installed on this development host; VM unit
verification remains an owner action. No Azure request or container start was
performed. The optional unit must be verified against the real protected service.
