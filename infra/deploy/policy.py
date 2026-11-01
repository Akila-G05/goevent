"""Fail-closed release policy shared by CI and the VM; standard library only."""
import datetime as dt
import re

HEX = r'[0-9a-f]{64}'

def validate(value, registry, repository):
    required = {'schema', 'repository', 'commit', 'run_id', 'created_at', 'expires_at', 'images', 'security_passed', 'migration_plan', 'rollback_safe'}
    if not isinstance(value, dict) or set(value) != required:
        raise ValueError('invalid manifest fields')
    if type(value['schema']) is not int or value['schema'] != 1 or value['repository'] != repository:
        raise ValueError('untrusted manifest source')
    if not re.fullmatch(r'[0-9a-f]{40}', str(value['commit'])) or type(value['run_id']) is not int or value['run_id'] < 1:
        raise ValueError('invalid build identity')
    if value['security_passed'] is not True or type(value['rollback_safe']) is not bool:
        raise ValueError('security/rollback policy missing')
    if not re.fullmatch(r'[a-zA-Z0-9._-]{1,100}', value['migration_plan']):
        raise ValueError('migration plan required')
    now = dt.datetime.now(dt.timezone.utc)
    created, expires = (dt.datetime.fromisoformat(value[k].replace('Z', '+00:00')) for k in ('created_at', 'expires_at'))
    if not created.tzinfo or not expires.tzinfo or created > now + dt.timedelta(minutes=5) or expires <= now or expires-created > dt.timedelta(days=7):
        raise ValueError('expired or invalid release window')
    if not re.fullmatch(r'[a-z0-9]+\.azurecr\.io', registry):
        raise ValueError('invalid registry')
    if set(value['images']) != {'backend', 'gateway'}:
        raise ValueError('invalid image pair')
    for component, image in value['images'].items():
        if not isinstance(image, str) or not re.fullmatch(re.escape(registry) + '/goevent/' + component + '@sha256:' + HEX, image):
            raise ValueError('mutable or unauthorized image')
    return value


def trusted_run(run, repository):
    if (run.get('event') != 'push' or run.get('head_branch') != 'main' or
        run.get('conclusion') != 'success' or run.get('path') != '.github/workflows/publish-acr.yml' or
        run.get('repository', {}).get('full_name') != repository):
        raise ValueError('not a successful trusted main publishing run')


def guard_environment(env):
    for key in ('AZURE_CLIENT_ID','AZURE_TENANT_ID','AZURE_SUBSCRIPTION_ID','AZURE_ACR_NAME','AZURE_ACR_LOGIN_SERVER'):
        if not env.get(key):
            raise ValueError('OWNER ACTION REQUIRED: missing '+key)


def require_reviewers(environment):
    if not any(r.get('type')=='required_reviewers' and r.get('reviewers') for r in environment.get('protection_rules',[])):
        raise ValueError('OWNER ACTION REQUIRED: production reviewers not enforced')
