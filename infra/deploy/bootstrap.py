#!/usr/bin/env python3
"""Stage application configtree files only; never provision MySQL or start services."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import tempfile
from urllib.parse import urlsplit

INFRA = Path(__file__).resolve().parents[1]
RUNTIME = Path('/run/goevent')
APP_PASSWORD_FILES = ('/run/goevent/secrets/mysql_app_password',
                      '/run/goevent/mysql-secrets/mysql_app_password')
SECRET_NAMES = {'mysql-app-password', 'mysql-migration-password', 'mysql-ca',
                'mysql-server-cert', 'mysql-truststore-password', 'redis-ca',
                'redis-server-cert', 'redis-server-key', 'redis-backend-password',
                'redis-gateway-password', 'redis-health-password'}


def command(args, **kwargs):
    # Never forward provider, keytool or OpenSSL output/errors to the terminal.
    return subprocess.run(args, check=True, capture_output=True, timeout=60, **kwargs).stdout


def trusted(path, uid=0, mode=None):
    path = Path(path)
    for parent in [path, *path.parents]:
        info = parent.lstat()
        if stat.S_ISLNK(info.st_mode) or info.st_uid != (uid if parent == path else 0):
            raise ValueError('unsafe owner or symlink')
        if info.st_mode & 0o022:
            raise ValueError('writable operator path')
    info = path.lstat()
    if mode is not None and stat.S_IMODE(info.st_mode) != mode:
        raise ValueError('incorrect operator permissions')
    return path


def private_read(path):
    path = trusted(path)
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_mode & 0o077 or info.st_nlink != 1:
        raise ValueError('root-only regular file required')
    with path.open('rb') as source:
        value = source.read(65537)
    if not value or len(value) > 65536:
        raise ValueError('empty or oversized protected value')
    return value


def configuration(value):
    expected = {'approved', 'mysql_tls_and_grants_reviewed', 'vault', 'managed_identity_client_id',
                'reuse_protected_app_password', 'allowed_origins', 'google_client_id', 'secret_ids'}
    if set(value) != expected or value['approved'] is not True or value['mysql_tls_and_grants_reviewed'] is not True:
        raise ValueError('explicit bootstrap and MySQL review approval required')
    if type(value['reuse_protected_app_password']) is not bool:
        raise ValueError('explicit password source required')
    vault = value['vault']
    if not isinstance(vault, str) or not re.fullmatch(r'[a-zA-Z][a-zA-Z0-9-]{1,22}[a-zA-Z0-9]', vault):
        raise ValueError('invalid vault')
    client = value['managed_identity_client_id']
    if client and not re.fullmatch(r'[0-9a-f-]{36}', client):
        raise ValueError('invalid identity')
    names = SECRET_NAMES - ({'mysql-app-password'} if value['reuse_protected_app_password'] else set())
    if set(value['secret_ids']) != names:
        raise ValueError('exact versioned secret inventory required')
    for identifier in value['secret_ids'].values():
        if not isinstance(identifier, str) or not re.fullmatch(
                r'https://' + re.escape(vault) + r'\.vault\.azure\.net/secrets/[a-zA-Z0-9-]{1,127}/[0-9a-f]{32}', identifier):
            raise ValueError('pinned version in the approved vault required')
    origins = value['allowed_origins']
    if not isinstance(origins, list) or not 1 <= len(origins) <= 10:
        raise ValueError('explicit origins required')
    for origin in origins:
        parsed = urlsplit(origin)
        if (parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password
            or parsed.path or parsed.query or parsed.fragment or '*' in origin or ',' in origin
            or any(c.isspace() for c in origin)):
            raise ValueError('HTTPS origins only')
        _ = parsed.port
    if not re.fullmatch(r'[a-zA-Z0-9-]+\.apps\.googleusercontent\.com', value['google_client_id']):
        raise ValueError('Google audience client ID required')
    return value


def fetch(identifier, env):
    data = json.loads(command(['az', 'keyvault', 'secret', 'show', '--id', identifier,
                              '--only-show-errors', '--output', 'json'], env=env))
    if (not isinstance(data, dict) or not isinstance(data.get('id'), str)
        or not isinstance(data.get('value'), str) or not isinstance(data.get('attributes'), dict)
        or data['id'].lower() != identifier.lower() or data['attributes'].get('enabled') is not True):
        raise ValueError('unexpected or disabled secret version')
    value = data['value'].encode('utf-8')
    if not value or len(value) > 32768:
        raise ValueError('empty or oversized Key Vault value')
    return value


def reused_app_password():
    first, second = (private_read(path) for path in APP_PASSWORD_FILES)
    if first != second:
        raise ValueError('protected application password copies disagree')
    return password(first)


def password(value):
    # Single-line bytes are consumed identically by configtree, ACL and keytool.
    if not 12 <= len(value) <= 256 or any(c < 33 or c > 126 for c in value):
        raise ValueError('password must be 12-256 printable non-whitespace ASCII bytes')
    return value


def certificate(ca, cert, hostname):
    for path in (ca, cert):
        command(['openssl', 'x509', '-in', str(path), '-noout', '-checkend', '604800'])
    ca_details = command(['openssl', 'x509', '-in', str(ca), '-noout', '-ext', 'basicConstraints'])
    if b'CA:TRUE' not in ca_details:
        raise ValueError('CA certificate required')
    san = command(['openssl', 'x509', '-in', str(cert), '-noout', '-ext', 'subjectAltName'])
    if not re.search(rb'\bDNS:' + hostname.encode() + rb'(?=[,\s]|$)', san):
        raise ValueError('explicit service DNS SAN required')
    command(['openssl', 'verify', '-no-CApath', '-no-CAstore', '-CAfile', str(ca),
             '-purpose', 'sslserver', '-auth_level', '2', '-verify_hostname', hostname, str(cert)])


def runtime_values(config, secrets, work):
    for name in ('mysql-app-password', 'mysql-migration-password', 'mysql-truststore-password',
                 'redis-backend-password', 'redis-gateway-password', 'redis-health-password'):
        password(secrets[name])
    passwords = [value for name, value in secrets.items() if name.endswith('-password')]
    if len(set(passwords)) != len(passwords):
        raise ValueError('database, truststore and Redis passwords must be distinct')
    paths = {}
    for name in ('mysql-ca', 'mysql-server-cert', 'redis-ca', 'redis-server-cert', 'redis-server-key', 'mysql-truststore-password'):
        paths[name] = work / name
        paths[name].write_bytes(secrets[name]); paths[name].chmod(0o600)
    certificate(paths['mysql-ca'], paths['mysql-server-cert'], 'mysql')
    certificate(paths['redis-ca'], paths['redis-server-cert'], 'redis')
    cert_key = command(['openssl', 'x509', '-in', str(paths['redis-server-cert']), '-pubkey', '-noout'])
    private_key = command(['openssl', 'pkey', '-in', str(paths['redis-server-key']), '-passin', 'pass:', '-pubout'])
    if cert_key != private_key:
        raise ValueError('Redis certificate/key mismatch')
    truststore = work/'mysql-truststore.p12'
    command(['keytool', '-importcert', '-noprompt', '-alias', 'goevent-mysql-ca', '-file', str(paths['mysql-ca']),
             '-keystore', str(truststore), '-storetype', 'PKCS12',
             '-storepass:file', str(paths['mysql-truststore-password'])])
    acl = (INFRA/'config/redis/redis.acl.example').read_text()
    for user in ('backend', 'gateway', 'health'):
        acl = acl.replace('REPLACE_'+user.upper()+'_PASSWORD_SHA256',
                          hashlib.sha256(secrets['redis-'+user+'-password']).hexdigest())
    if 'REPLACE_' in acl:
        raise ValueError('unrendered ACL')
    origins = ','.join(config['allowed_origins']).encode()
    return {
        'backend/spring.datasource.password': secrets['mysql-app-password'],
        'backend/spring.flyway.password': secrets['mysql-migration-password'],
        'backend/MYSQL_TRUSTSTORE_PASSWORD': secrets['mysql-truststore-password'],
        'backend/mysql-truststore.p12': truststore.read_bytes(),
        'backend/spring.data.redis.password': secrets['redis-backend-password'],
        'backend/redis-ca.crt': secrets['redis-ca'],
        'backend/GOEVENT_ALLOWED_ORIGINS': origins,
        'backend/GOEVENT_GOOGLE_CLIENT_ID': config['google_client_id'].encode(),
        'gateway/spring.data.redis.password': secrets['redis-gateway-password'],
        'gateway/redis-ca.crt': secrets['redis-ca'],
        'gateway/GOEVENT_ALLOWED_ORIGINS': origins,
        'redis/redis.crt': secrets['redis-server-cert'],
        'redis/redis.key': secrets['redis-server-key'],
        'redis/redis-ca.crt': secrets['redis-ca'],
        'redis/redis.acl': acl.encode(),
        'redis/health-password': secrets['redis-health-password'],
    }


def stopped():
    # Read-only check: never start the protected service or mount its disk here.
    command(['systemctl', 'is-active', '--quiet', 'goevent.service'])
    for project in ('goevent-app', 'goevent-dependencies'):
        if command(['docker', 'ps', '-q', '--filter', 'label=com.docker.compose.project='+project]).strip():
            raise ValueError('application and dependency containers must be stopped before bootstrap')


def install(values, root, prepared):
    # No overwrite: existing matching files can be retained and missing files completed.
    # PKCS12 files include random salts, so only a fresh/partial bootstrap is supported;
    # a completed bootstrap should use --check, not regenerate its truststore.
    trusted(root)
    for component in ('backend', 'gateway', 'redis'):
        directory = root/component
        if directory.exists() or directory.is_symlink():
            trusted(directory, mode=0o750)
            allowed = {Path(name).name for name in values if name.startswith(component+'/')}
            if not directory.is_dir() or any(item.name not in allowed for item in directory.iterdir()):
                raise ValueError('unexpected runtime entries')
    for name, data in values.items():
        target = root/name
        if target.exists() or target.is_symlink():
            trusted(target, mode=0o640)
            info = target.lstat()
            if not stat.S_ISREG(info.st_mode) or info.st_gid != 10001 or info.st_nlink != 1 or target.read_bytes() != data:
                raise ValueError('existing runtime inventory conflicts; explicit rotation review required')
    prepared.mkdir(mode=0o700)
    created, directories = [], []
    try:
        for component in ('backend', 'gateway', 'redis'):
            directory = root/component
            if not directory.exists():
                directory.mkdir(mode=0o750); directories.append(directory); os.chown(directory, 0, 10001)
            trusted(directory, mode=0o750)
            if directory.stat().st_gid != 10001:
                raise ValueError('runtime directory requires root:10001')
        for index, (name, data) in enumerate(values.items()):
            target = root/name
            if target.exists():
                continue
            source = prepared/str(index)
            source.write_bytes(data); os.chown(source, 0, 10001); source.chmod(0o640)
            os.link(source, target)  # Atomic O_EXCL-style publication; never replaces a file/link.
            created.append(target)
            source.unlink()
    except Exception:
        for target in reversed(created): target.unlink()
        for directory in reversed(directories): directory.rmdir()
        raise


def inventory():
    return json.loads((INFRA/'deploy/operator-policy.example.json').read_text())['required_secrets']


def check():
    ok = True
    for name in inventory():
        try:
            target = trusted(RUNTIME/name, mode=0o640)
            info = target.lstat()
            directory = trusted(target.parent, mode=0o750)
            valid = (stat.S_ISREG(info.st_mode) and info.st_gid == 10001 and info.st_size > 0
                     and info.st_nlink == 1 and directory.stat().st_gid == 10001)
        except (OSError, ValueError):
            valid = False
        print(('READY ' if valid else 'MISSING_OR_UNSAFE ')+name)
        ok = ok and valid
    return ok


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', default='/etc/goevent-release/bootstrap.json')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if os.geteuid() != 0: raise ValueError('root required')
    if args.check:
        return 0 if check() else 1
    os.umask(0o077)
    config = configuration(json.loads(private_read(args.config)))
    trusted(RUNTIME)
    # The existing parent must remain operator-owned, never chowned by this helper.
    lock = os.open('/run/goevent-application-bootstrap.lock', os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW, 0o600)
    with os.fdopen(lock, 'w') as handle:
        trusted('/run/goevent-application-bootstrap.lock', mode=0o600)
        fcntl.flock(handle, fcntl.LOCK_EX|fcntl.LOCK_NB)
        stopped()
        with tempfile.TemporaryDirectory(prefix='goevent-bootstrap-', dir='/run') as temporary:
            work = Path(temporary)
            # Separate CLI cache; never change the existing MySQL/bootstrap login state.
            env = os.environ | {'AZURE_CONFIG_DIR': str(work/'azure'), 'AZURE_CORE_COLLECT_TELEMETRY': 'no'}
            login = ['az', 'login', '--identity', '--allow-no-subscriptions', '--output', 'none', '--only-show-errors']
            if config['managed_identity_client_id']: login += ['--client-id', config['managed_identity_client_id']]
            command(login, env=env)
            secrets = {name: fetch(identifier, env) for name, identifier in config['secret_ids'].items()}
            if config['reuse_protected_app_password']:
                secrets['mysql-app-password'] = reused_app_password()
            values = runtime_values(config, secrets, work)
            if set(values) != set(inventory()): raise ValueError('runtime inventory drift')
            stopped()
            install(values, RUNTIME, work/'prepared')
    print('Application runtime inventory staged; MySQL bootstrap and release policy unchanged')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        raise SystemExit('Application bootstrap rejected; verify approved inventory, permissions, certificates and owner prerequisites. No secret output is available.')
