"""Prepared VM agent. Requires root-owned operator policy and verified Blob delivery.
No installation/activation is performed by this repository.
"""
import argparse
import fcntl
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
from policy import validate

def run(args, timeout=120, **kwargs):
    return subprocess.run(args,check=True,timeout=timeout,capture_output=True,**kwargs).stdout

def protected(path, directory=False):
    p=Path(path)
    s=p.lstat()
    for parent in p.resolve().parents:
        ps=parent.stat()
        if ps.st_uid!=0 or ps.st_mode & 0o022:
            raise ValueError('unprotected parent: '+str(parent))
    if p.is_symlink() or s.st_uid!=0 or s.st_mode & 0o022 or (directory and not p.is_dir()):
        raise ValueError('unprotected operator path: '+str(p))
    return p

def protected_tree(path):
    root = protected(path, True)
    for p in [root, *root.rglob('*')]:
        protected(p, p.is_dir())
        info = p.lstat()
        expected = 0o750 if p.is_dir() else 0o640
        if (not p.is_dir() and not p.is_file()) or info.st_gid != 10001 or info.st_mode & 0o777 != expected:
            raise ValueError('runtime tree requires root:10001 directories 0750/files 0640')


def network_preflight():
    network = json.loads(run(['docker', 'network', 'inspect', 'goevent_goevent_internal']))[0]
    if network['Driver'] != 'bridge' or network['Internal'] is not True or network['Attachable'] is not False:
        raise ValueError('protected MySQL network differs from approved bridge')
    for name in ('goevent-application', 'goevent-ingress'):
        private = json.loads(run(['docker', 'network', 'inspect', name]))[0]
        if private['Driver'] != 'bridge' or private['Internal'] is not True:
            raise ValueError('private application network required')


def validate_model(model, images):
    if set(model['services']) != {'backend', 'gateway'} or model.get('volumes'):
        raise ValueError('compose must contain application services only')
    expected_networks = {'database': 'goevent_goevent_internal', 'application': 'goevent-application',
                         'ingress': 'goevent-ingress', 'backend-egress': 'goevent-backend-egress'}
    if set(model.get('networks', {})) != set(expected_networks):
        raise ValueError('unexpected application networks')
    for key, name in expected_networks.items():
        if model['networks'][key].get('external') is not True or model['networks'][key].get('name') != name:
            raise ValueError('external network contract changed')
    for name, service in model['services'].items():
        networks = {'application', 'database', 'backend-egress'} if name == 'backend' else {'ingress', 'application'}
        if (service.get('image') != images[name] or service.get('ports') or service.get('privileged')
            or service.get('restart', 'no') != 'no' or service.get('network_mode') or service.get('cap_add')
            or service.get('user') != '10001:10001' or service.get('read_only') is not True
            or set(service.get('networks', {})) != networks
            or service.get('cap_drop') != ['ALL']
            or 'no-new-privileges:true' not in service.get('security_opt', [])):
            raise ValueError('unsafe application service')
        expected = {'/run/goevent/'+name: '/run/secrets', '/opt/goevent/app-config/'+name: '/run/config'}
        mounts = service.get('volumes', [])
        if len(mounts) != 2:
            raise ValueError('required runtime binds missing')
        for mount in mounts:
            if (mount.get('type') != 'bind' or not mount.get('read_only')
                or expected.get(mount.get('source')) != mount.get('target')
                or mount.get('bind', {}).get('create_host_path') is not False):
                raise ValueError('unapproved service bind')


def preflight(c):
    if not c.get('enabled') or not c.get('disk_uuid'):
        raise ValueError('deployment/disk guard not configured')
    if c['mysql_mount']!='/srv/goevent/mysql' or c['mysql_data']!='/srv/goevent/mysql/data':
        raise ValueError('unexpected database path')
    actual=run(['findmnt','--noheadings','--raw','--mountpoint',c['mysql_mount'],'--output','UUID']).decode().strip()
    if actual!=c['disk_uuid'] or not Path(c['mysql_data']).is_dir():
        raise ValueError('missing or incorrect protected disk')
    run(['systemctl','is-active','--quiet','docker'])
    run(['systemctl','is-active','--quiet','goevent.service'])
    protected(c['state_dir'], True)
    for component in ('backend', 'gateway', 'redis'):
        protected_tree(Path(c['secrets_dir']) / component)
    for component in ('backend', 'gateway', 'redis', 'caddy'):
        protected_tree(Path(c['config_dir']) / component)
    for component, filename in [('backend','application.properties'), ('gateway','application.properties'),
                                ('redis','redis.conf'), ('caddy','Caddyfile')]:
        config = protected(Path(c['config_dir']) / component / filename)
        if not config.is_file() or not config.stat().st_size:
            raise ValueError('required runtime configuration absent')
    network_preflight()
    if not c.get('required_secrets'):
        raise ValueError('required secret inventory absent')
    for filename in c['required_secrets']:
        p=protected(Path(c['secrets_dir'])/filename)
        if not p.stat().st_size or p.stat().st_mode & 0o007 or p.stat().st_gid!=10001 or not p.stat().st_mode & 0o040:
            raise ValueError('missing/insecure runtime secret')
    for key in ('backup_evidence','migration_approval','compose_file','health_hook'):
        protected(c[key])
    if not os.access(c['health_hook'],os.X_OK):
        raise ValueError('health hook is not executable')
    backup=json.loads(Path(c['backup_evidence']).read_text())
    if (backup.get('integrity_verified') is not True or backup.get('isolated_restore_verified') is not True
        or backup.get('cipher')!='AES-256-GCM' or backup.get('private_blob') is not True
        or not 0 <= time.time()-backup['verified_epoch'] <= c['max_backup_age_seconds']):
        raise ValueError('fresh verified backup/restore evidence required')

def deploy(c, intent):
    validate(intent,c['registry'],c['repository'])
    preflight(c)
    approval=json.loads(Path(c['migration_approval']).read_text())
    if approval.get('plan')!=intent['migration_plan'] or approval.get('commit')!=intent['commit'] or approval.get('approved') is not True:
        raise ValueError('migration plan not approved for commit')
    # Existing protected orchestration stages Key Vault secrets. Never fetch/replace them here.
    run(['az','login','--identity','--output','none'])
    state=Path(c['state_dir'])
    with tempfile.TemporaryDirectory(dir=state) as tmp:
        envfile=Path(tmp)/'images.env'
        envfile.write_text('\n'.join(k.upper()+'_IMAGE='+v for k,v in intent['images'].items())+'\n')
        envfile.chmod(0o600)
        cmd=['docker','compose','--project-name','goevent-app','--env-file',str(envfile),'-f',c['compose_file']]
        model=json.loads(run(cmd+['config','--format','json']))
        validate_model(model, intent['images'])
        previous=state/'current.json'
        if previous.exists():
            protected(previous)
        # Pull auth is stored only in a temporary Docker config, never in application env.
        env=os.environ|{'DOCKER_CONFIG':str(Path(tmp)/'docker')}
        run(['az','acr','login','--name',c['acr_name'],'--output','none'],env=env)
        for image in intent['images'].values():
            run(['docker','pull',image],env=env,timeout=300)
            run(['gh','attestation','verify','oci://'+image,'--repo',c['repository'],
                 '--signer-workflow',c['repository']+'/.github/workflows/publish-acr.yml',
                 '--signer-digest',intent['commit'], '--source-digest',intent['commit'],
                 '--source-ref','refs/heads/main', '--deny-self-hosted-runners'],env=env)
        try:
            run(cmd+['up','-d','--no-deps','--wait','--wait-timeout','180','backend','gateway'],env=env,timeout=240)
            # Root-owned health hook contains operator-approved bounded HTTP/Redis checks.
            hook=protected(c['health_hook'])
            subprocess.run([str(hook)],check=True,timeout=60,capture_output=True)
        except (subprocess.SubprocessError, OSError):
            if previous.exists() and intent['rollback_safe'] and approval.get('rollback_safe') is True:
                try:
                    old=validate(json.loads(previous.read_text()),c['registry'],c['repository'])
                    envfile.write_text('\n'.join(k.upper()+'_IMAGE='+v for k,v in old['images'].items())+'\n')
                    run(cmd+['up','-d','--no-deps','--wait','--wait-timeout','180','backend','gateway'],env=env,timeout=240)
                    subprocess.run([str(protected(c['health_hook']))],check=True,timeout=60,capture_output=True)
                except (ValueError, subprocess.SubprocessError, OSError):
                    run(cmd+['stop','--timeout','30','backend','gateway'],env=env)
                    raise
            else:
                # Never leave an unapproved/unhealthy first release running. No DB/dependency actions.
                run(cmd+['stop','--timeout','30','backend','gateway'],env=env)
            raise
        if previous.exists():
            (state/'previous.json').write_bytes(previous.read_bytes())
        staged=state/'current.pending'
        staged.write_text(json.dumps(intent,sort_keys=True)+'\n');staged.replace(previous)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--policy',required=True);parser.add_argument('--intent',required=True)
    args=parser.parse_args()
    if os.geteuid()!=0:
        raise ValueError('root protected orchestration required')
    c=json.loads(protected(args.policy).read_text())
    state=protected(c['state_dir'],True)
    fd=os.open(state/'deployment.lock',os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW,0o600)
    with os.fdopen(fd,'w') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        # Intent must be staged by the separately reviewed MI delivery adapter.
        intent=json.loads(protected(args.intent).read_text())
        deploy(c,intent)

if __name__=='__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.SubprocessError, KeyError):
        raise SystemExit('Deployment rejected or failed; inspect protected operator state')
