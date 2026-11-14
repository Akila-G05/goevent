"""Run real services against disposable MySQL/Redis, never the Compose database."""

import base64
import http.cookiejar
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[2]


def command(args, **kwargs):
    return subprocess.run(
        args, check=True, capture_output=True, text=True, timeout=120, **kwargs
    ).stdout


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


def get(port, path, headers=None):
    request = urllib.request.Request(
        f'http://127.0.0.1:{port}{path}', headers=headers or {}
    )
    with urllib.request.urlopen(request, timeout=5) as response:
        assert response.status == 200
        return json.loads(response.read())


def main(api_check=None):
    prefix = 'goevent-upgrade-' + uuid.uuid4().hex[:8]
    processes, containers = [], []
    validation = ROOT / 'infra/validation'
    validation.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=validation) as directory:
        temporary = Path(directory)
        password = secrets.token_hex(24)
        mysql_env = temporary / 'mysql.env'
        mysql_env.write_text(
            f'MYSQL_ROOT_PASSWORD={password}\nMYSQL_DATABASE=upgrade_test\n'
            f'MYSQL_USER=upgrade_app\nMYSQL_PASSWORD={password}\n'
        )
        mysql_env.chmod(0o600)
        redis_env = temporary / 'redis.env'
        redis_env.write_text(f'REDIS_PASSWORD={password}\n')
        redis_env.chmod(0o600)
        mysql, redis = prefix + '-mysql', prefix + '-redis'

        def mysql_query(sql):
            return command([
                'docker', 'exec', mysql, 'sh', '-c',
                'MYSQL_PWD="$MYSQL_PASSWORD" mysql --protocol=TCP -h127.0.0.1 '
                '-u"$MYSQL_USER" "$MYSQL_DATABASE" -Nse "$1"', 'sh', sql,
            ]).strip()

        def redis_command(*args):
            return command([
                'docker', 'exec', redis, 'sh', '-c',
                'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli --raw "$@"',
                'sh', *args,
            ]).strip()

        try:
            command([
                'docker', 'run', '--rm', '-d', '--name', mysql,
                '--tmpfs', '/var/lib/mysql:rw,size=1g',
                '-p', '127.0.0.1::3306', '--env-file', str(mysql_env), 'mysql:8.4',
            ])
            containers.append(mysql)
            command([
                'docker', 'run', '-d', '--name', redis,
                '-p', '127.0.0.1:'+str(free_port())+':6379', '--env-file', str(redis_env),
                'redis:7.4-alpine', 'sh', '-c',
                'exec redis-server --requirepass "$REDIS_PASSWORD"',
            ])
            containers.append(redis)
            db_port = command(['docker', 'port', mysql, '3306']).strip().rsplit(':', 1)[1]
            redis_port = command(['docker', 'port', redis, '6379']).strip().rsplit(':', 1)[1]
            for _ in range(90):
                try:
                    assert mysql_query('SELECT 1') == '1'
                    break
                except subprocess.CalledProcessError:
                    time.sleep(1)
            else:
                raise RuntimeError('Isolated MySQL did not become ready')

            backend_port, gateway_port = free_port(), free_port()
            environment = os.environ | {
                'DB_HOST': '127.0.0.1', 'DB_PORT': db_port,
                'DB_NAME': 'upgrade_test', 'DB_USER': 'upgrade_app',
                'DB_PASSWORD': password, 'PORT': str(backend_port),
                'GOOGLE_CLIENT_ID': 'local-test.apps.googleusercontent.com',
                'STATE': 'true', 'SPRING_DATA_REDIS_HOST': '127.0.0.1',
                'SPRING_DATA_REDIS_PORT': redis_port,
                'SPRING_DATA_REDIS_PASSWORD': password,
                'BACKEND_URL': f'http://127.0.0.1:{backend_port}',
                'SPRING_CONFIG_IMPORT': '',
                'APP_EMAIL_ENABLED': 'false',
            }
            services = [
                ('backend', 'backend/target/goevent-1.0-SNAPSHOT.war', backend_port),
                ('gateway', 'gateway/target/gateway-1.0-SNAPSHOT.jar', gateway_port),
            ]
            for component, artifact, port in services:
                runtime_env = environment | {
                    'SERVER_PORT': str(port),
                    'LOGGING_FILE_NAME': str(temporary / f'{component}.log'),
                    'LOGGING_LOGBACK_ROLLINGPOLICY_FILE_NAME_PATTERN':
                        str(temporary / f'{component}.%d.%i.log.gz'),
                }
                # The existing main methods ignore CLI arguments; use Spring's
                # environment binding, including disabling the local .env import.
                with (validation / f'upgrade-runtime-{component}.log').open('w') as output:
                    process = subprocess.Popen(
                        ['java', '-jar', str(ROOT / artifact)], cwd=ROOT,
                        env=runtime_env, stdout=output, stderr=output,
                    )
                processes.append(process)
                path = '/goevent/api/test' if component == 'backend' else '/actuator/health'
                for _ in range(90):
                    if process.poll() is not None:
                        raise RuntimeError(f'{component} exited; inspect its local smoke log')
                    try:
                        body = get(port, path)
                        assert body['status'] == ('UP' if component == 'gateway' else True)
                        break
                    except (OSError, AssertionError):
                        time.sleep(1)
                else:
                    raise RuntimeError(f'{component} did not become healthy')
                print(f'PASS: {component} startup and HTTP readiness', flush=True)

            migrations = list((ROOT / 'backend/src/main/resources/db/migration').rglob('V*__*.sql'))
            assert migrations
            assert mysql_query(
                'SELECT COUNT(*) FROM flyway_schema_history WHERE success = 1 AND version IS NOT NULL'
            ) == str(len(migrations))
            print('PASS: versioned Flyway migrations recorded in disposable MySQL', flush=True)
            # Preserve V2's password width and validate the additive profile schema.
            assert mysql_query("SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.columns "
                "WHERE table_schema = DATABASE() AND table_name = 'user' AND column_name = 'mobile'") == '15'
            assert mysql_query("SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.columns "
                "WHERE table_schema = DATABASE() AND table_name = 'user' AND column_name = 'password'") == '255'
            assert mysql_query("SELECT IS_NULLABLE FROM information_schema.columns "
                "WHERE table_schema = DATABASE() AND table_name = 'student_detail' AND column_name = 'university_id'") == 'YES'
            assert mysql_query("SELECT COUNT(*) FROM information_schema.key_column_usage "
                "WHERE table_schema = DATABASE() AND table_name = 'student_detail' "
                "AND column_name = 'university_id' AND referenced_table_name = 'university'") == '1'
            print('PASS: incremental V3 profile columns and university foreign key', flush=True)
            if api_check is not None:
                api_check(mysql_query, backend_port, gateway_port, temporary)
            missing_token = urllib.request.Request(
                f'http://127.0.0.1:{backend_port}/goevent/api/auth/google',
                data=b'{}', headers={'Content-Type': 'application/json'}, method='POST',
            )
            with urllib.request.urlopen(missing_token, timeout=5) as response:
                denied = json.loads(response.read())
                assert denied['status'] is False
                assert denied['message'] == 'Google ID token is missing'
            print('PASS: JSON authentication request rejects missing Google token', flush=True)
            # Real HTTP sessions/CSRF and Redis throttling for the admin-only chain.
            admin_client = urllib.request.build_opener(
                urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
            admin_url = f'http://127.0.0.1:{backend_port}/goevent/api/admin/auth'
            try:
                admin_client.open(admin_url + '/session', timeout=5)
                raise AssertionError('Anonymous admin access was allowed')
            except urllib.error.HTTPError as error:
                assert error.code == 401, error.code
            with admin_client.open(admin_url + '/csrf', timeout=5) as response:
                csrf = json.loads(response.read())
            payload = json.dumps({'email': 'admin-smoke@example.invalid', 'password': 'invalid-test-password'}).encode()
            def admin_login(headers):
                try:
                    admin_client.open(urllib.request.Request(admin_url + '/login', data=payload,
                        headers={'Content-Type':'application/json'} | headers), timeout=5)
                    raise AssertionError('Unknown account authenticated as admin')
                except urllib.error.HTTPError as error:
                    return error.code
            assert admin_login({}) == 403
            for _ in range(10):
                assert admin_login({csrf['headerName']:csrf['token']}) == 401
            assert admin_login({csrf['headerName']:csrf['token']}) == 429
            print('PASS: real admin session/CSRF denial and Redis-backed login throttle', flush=True)
            public_path = '/goevent/api/content/universities'
            body = get(gateway_port, public_path)
            assert body['status'] is True
            assert get(gateway_port, public_path) == body
            keys = redis_command('--scan', '--pattern', 'gateway:response:*').splitlines()
            assert len(keys) == 1, 'Expected a real Redis response-cache entry'
            cached = json.loads(redis_command('GET', keys[0]))
            assert json.loads(base64.b64decode(cached['body'])) == body
            assert 'CACHE HIT:' in (validation / 'upgrade-runtime-gateway.log').read_text()

            # Only allowlisted public endpoints may populate the shared cache.
            assert get(gateway_port, '/goevent/api/test')['status'] is True
            assert redis_command('--scan', '--pattern', 'gateway:response:*').splitlines() == keys
            # Authorization must bypass both an existing cached response and writes.
            gateway_log = validation / 'upgrade-runtime-gateway.log'
            hits = gateway_log.read_text().count('CACHE HIT:')
            assert get(gateway_port, public_path, {'Authorization': 'Bearer smoke'}) == body
            assert gateway_log.read_text().count('CACHE HIT:') == hits
            assert get(gateway_port, public_path + '?bypass=Authorization',
                       {'Authorization': 'Bearer smoke'}) == body
            assert redis_command('--scan', '--pattern', 'gateway:response:*').splitlines() == keys
            # Public content is identical for all callers; cookies remain eligible.
            cookie_path = public_path + '?cookie=smoke'
            assert get(gateway_port, cookie_path, {'Cookie': 'smoke=1'}) == body
            cookie_keys = redis_command('--scan', '--pattern', 'gateway:response:*').splitlines()
            assert len(cookie_keys) == 2, 'Expected cookie-bearing public response to be cached'
            cookie_key, = set(cookie_keys) - set(keys)
            cookie_cached = json.loads(redis_command('GET', cookie_key))
            assert json.loads(base64.b64decode(cookie_cached['body'])) == body
            hits = gateway_log.read_text().count('CACHE HIT:')
            assert get(gateway_port, cookie_path, {'Cookie': 'smoke=1'}) == body
            assert gateway_log.read_text().count('CACHE HIT:') > hits
            print('PASS: public cache round trip, non-public/Authorization bypass and public cookie caching', flush=True)

            # Let the default rate-limit bucket refill before the strict-route check.
            time.sleep(2)

            statuses = []
            for _ in range(4):
                try:
                    with urllib.request.urlopen(
                        f'http://127.0.0.1:{gateway_port}/goevent/api/test/strict', timeout=5
                    ) as response:
                        statuses.append(response.status)
                except urllib.error.HTTPError as error:
                    statuses.append(error.code)
            assert 200 in statuses and 429 in statuses, statuses
            print('PASS: routed API and Redis-backed rate limiting (HTTP 429)', flush=True)
            # Cache-only public content falls back to the backend; the rate limiter must fail closed.
            time.sleep(2)
            assert get(gateway_port, '/goevent/api/content/universities')['status'] is True
            command(['docker', 'stop', redis])
            try:
                get(gateway_port, '/goevent/api/test?redis-outage=1')
                raise AssertionError('Rate limiter failed open during Redis outage')
            except urllib.error.HTTPError as error:
                assert error.code == 503, error.code
            assert get(gateway_port, '/goevent/api/content/universities')['status'] is True
            command(['docker', 'start', redis])
            for _ in range(30):
                try:
                    assert get(gateway_port, '/goevent/api/test?recovered=1')['status'] is True
                    break
                except (OSError, AssertionError):
                    time.sleep(1)
            else:
                raise AssertionError('Redis recovery did not restore rate limiting')
            print('PASS: Redis outage denies rate-limited traffic, cache fallback and recovery', flush=True)
            # Prove failed MySQL DDL stops a fresh backend startup. Disposable DB only.
            processes[0].terminate()
            processes[0].wait(timeout=15)
            bad_migrations = temporary / 'bad-migrations'
            bad_migrations.mkdir()
            for migration in migrations:
                (bad_migrations/migration.name).write_bytes(migration.read_bytes())
            (bad_migrations/'V999__failure_test.sql').write_text('THIS IS INVALID MYSQL DDL;\n')
            failed_env = environment | {
                'SERVER_PORT': str(backend_port),
                'SPRING_FLYWAY_LOCATIONS': 'filesystem:'+str(bad_migrations),
                'LOGGING_FILE_NAME': str(temporary/'failed-migration.log'),
            }
            with (temporary/'failed-migration-stdout.log').open('w') as output:
                failed = subprocess.Popen(['java','-jar',str(ROOT/'backend/target/goevent-1.0-SNAPSHOT.war')],
                    cwd=ROOT, env=failed_env, stdout=output, stderr=output)
            processes.append(failed)
            assert failed.wait(timeout=60) != 0
            assert 'Migration' in (temporary/'failed-migration-stdout.log').read_text()
            print('PASS: unsuccessful Flyway migration prevents backend startup', flush=True)
        finally:
            for process in reversed(processes):
                process.terminate()
                try:
                    process.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
            for name in reversed(containers):
                command(['docker', 'rm', '-f', name])
            print('Removed isolated test services; existing database untouched', flush=True)


if __name__ == '__main__':
    main()
