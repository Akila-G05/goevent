"""Exercise the shipped Redis TLS/ACL policy and Caddy config in disposable containers.
No public ports, Azure access, production paths or existing Docker networks are used.
"""
import hashlib
import os
from pathlib import Path
import secrets
import subprocess
import tempfile
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
REDIS = 'redis:7.4-alpine@sha256:7f7d30b7fdd09467bac58198a1f166dd69789d348d4fe859cccb20e0cf287fbe'
CADDY = 'goevent-caddy:infra-check'


def run(args, **kwargs):
    return subprocess.run(args, check=True, capture_output=True, text=True, timeout=kwargs.pop('timeout',120), **kwargs).stdout


def main():
    run(['docker','build','-f',str(ROOT/'infra/docker/caddy.Dockerfile'),
         '-t',CADDY,str(ROOT/'infra/docker')], timeout=1200)
    build_info = run(['docker','run','--rm','--network','none',CADDY,'caddy','build-info'])
    assert 'github.com/go-jose/go-jose/v3' not in build_info, 'vulnerable jose v3 remains'
    assert 'golang.org/x/net\tv0.62.0' in build_info, 'patched x/net missing'
    name = 'goevent-dependency-smoke-' + uuid.uuid4().hex[:8]
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        # Test fixtures only. Production trees must instead be root:10001 (0750/0640).
        root.chmod(0o750)
        run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(root/'redis.key'),
             '-out',str(root/'redis.crt'),'-days','1','-subj','/CN=redis',
             '-addext','subjectAltName=DNS:redis,IP:127.0.0.1'])
        (root/'redis-ca.crt').write_bytes((root/'redis.crt').read_bytes())
        passwords = {user: secrets.token_hex(24) for user in ('backend','gateway','health')}
        acl = (ROOT/'infra/config/redis/redis.acl.example').read_text()
        for user, password in passwords.items():
            acl = acl.replace('REPLACE_'+user.upper()+'_PASSWORD_SHA256', hashlib.sha256(password.encode()).hexdigest())
        (root/'redis.acl').write_text(acl)
        config = (ROOT/'infra/compose/redis.conf.example').read_text().replace('/run/secrets/', '/fixture/')
        (root/'redis.conf').write_text(config)
        (root/'Caddyfile').write_bytes((ROOT/'infra/compose/Caddyfile.example').read_bytes())
        (root/'Caddyfile.staging').write_bytes((ROOT/'infra/config/caddy/Caddyfile.staging').read_bytes())
        for path in root.iterdir(): path.chmod(0o640)
        try:
            run(['docker','run','-d','--name',name,'--network','none',
                 '--user','10001:10001','--group-add',str(os.getgid()),'--read-only',
                 '--cap-drop','ALL','--security-opt','no-new-privileges:true',
                 '--mount','type=bind,src='+directory+',dst=/fixture,readonly',
                 '--tmpfs','/data:rw,noexec,nosuid,size=16m,uid=10001,gid=10001',
                 REDIS,'redis-server','/fixture/redis.conf'])
            def cli(user, *args, tls=True):
                env = root/'client.env'
                env.write_text('REDISCLI_AUTH='+passwords[user]+'\n'); env.chmod(0o600)
                # Credentials never enter command arguments or test output.
                flags = ['--tls','--cacert','/fixture/redis-ca.crt'] if tls else []
                return run(['docker','exec','--env-file',str(env),name,'redis-cli',
                            '--user',user,'--raw',*flags,*args]).strip()
            for _ in range(30):
                try:
                    if cli('health','PING') == 'PONG': break
                except subprocess.SubprocessError: pass
                time.sleep(1)
            else:
                raise AssertionError('Redis TLS readiness failed: '+run(['docker','logs',name])[-2500:])
            assert cli('backend','SET','goevent:session:test','value') == 'OK'
            assert 'NOPERM' in cli('backend','GET','gateway:response:test')
            assert cli('gateway','SET','gateway:response:test','value') == 'OK'
            assert 'NOPERM' in cli('gateway','GET','goevent:session:test')
            assert 'NOPERM' in cli('health','GET','gateway:response:test')
            script = "return {redis.call('TIME')[1], redis.call('SETEX',KEYS[1],5,'1')}"
            assert 'NOPERM' not in cli('gateway','EVAL',script,'1','request_rate_limiter.{test}.tokens')
            try:
                assert cli('health','PING',tls=False) != 'PONG'
            except subprocess.SubprocessError: pass
            unauth = run(['docker','exec',name,'redis-cli','--tls','--cacert','/fixture/redis-ca.crt','PING'])
            assert 'NOAUTH' in unauth
            run(['docker','run','--rm','--network','none','--user','10001:10001',
                 '--group-add',str(os.getgid()),'--read-only','--cap-drop','ALL',
                 '--mount','type=bind,src='+directory+',dst=/fixture,readonly',
                 '--tmpfs','/data:rw,size=16m,uid=10001,gid=10001',
                 '--tmpfs','/config:rw,size=16m,uid=10001,gid=10001',
                 '-e','GOEVENT_API_DOMAIN=staging.example.invalid',CADDY,
                 'caddy','validate','--config','/fixture/Caddyfile','--adapter','caddyfile'])
            run(['docker','run','--rm','--network','none','--user','10001:10001',
                 '--group-add',str(os.getgid()),'--read-only','--cap-drop','ALL',
                 '--mount','type=bind,src='+directory+',dst=/fixture,readonly',
                 '--tmpfs','/data:rw,size=16m,uid=10001,gid=10001',
                 '--tmpfs','/config:rw,size=16m,uid=10001,gid=10001',CADDY,
                 'caddy','validate','--config','/fixture/Caddyfile.staging','--adapter','caddyfile'])
            print('PASS: Redis TLS-only, ACL separation, Lua permissions and custom Caddy production/staging configurations')
        finally:
            subprocess.run(['docker','rm','-f',name], capture_output=True, timeout=30)


if __name__ == '__main__': main()
