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

def run(args, **kwargs):
    return subprocess.run(args,check=True,timeout=120,capture_output=True,**kwargs).stdout

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
    for key in ('secrets_dir','config_dir','state_dir'):
        protected(c[key],True)
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
        # A dedicated application-only project must have no database/storage definitions.
        model=json.loads(run(cmd+['config','--format','json']))
        if set(model['services'])!={'backend','gateway'} or model.get('volumes'):
            raise ValueError('compose must contain application services only')
        for name,service in model['services'].items():
            if service.get('image')!=intent['images'][name] or service.get('ports') or service.get('privileged') or service.get('restart','no')!='no' or service.get('network_mode') or service.get('cap_add') or service.get('user')!='10001:10001' or service.get('read_only') is not True:
                raise ValueError('unsafe application service')
            for mount in service.get('volumes',[]):
                if mount.get('type')!='bind' or not mount.get('read_only') or mount.get('source') not in (
                    '/run/goevent/'+name, '/opt/goevent/app-config/'+name):
                    raise ValueError('unapproved service bind')
        previous=state/'current.json'
        if previous.exists() and json.loads(previous.read_text())==intent:
            return
        # Pull auth is stored only in a temporary Docker config, never in application env.
        env=os.environ|{'DOCKER_CONFIG':str(Path(tmp)/'docker')}
        run(['az','acr','login','--name',c['acr_name'],'--output','none'],env=env)
        for image in intent['images'].values():
            run(['docker','pull',image],env=env)
            run(['gh','attestation','verify','oci://'+image,'--repo',c['repository'],
                 '--signer-workflow',c['repository']+'/.github/workflows/publish-acr.yml',
                 '--signer-digest',intent['commit']],env=env)
        try:
            run(cmd+['up','-d','--no-deps','--wait','--wait-timeout','120','backend','gateway'],env=env)
            # Root-owned health hook contains operator-approved bounded HTTP/Redis checks.
            hook=protected(c['health_hook'])
            subprocess.run([str(hook)],check=True,timeout=60,capture_output=True)
        except (subprocess.SubprocessError, OSError):
            if previous.exists() and intent['rollback_safe'] and approval.get('rollback_safe') is True:
                old=validate(json.loads(previous.read_text()),c['registry'],c['repository'])
                envfile.write_text('\n'.join(k.upper()+'_IMAGE='+v for k,v in old['images'].items())+'\n')
                run(cmd+['up','-d','--no-deps','--wait','--wait-timeout','120','backend','gateway'],env=env)
                subprocess.run([str(protected(c['health_hook']))],check=True,timeout=60,capture_output=True)
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
