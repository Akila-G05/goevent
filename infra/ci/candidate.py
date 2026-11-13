import datetime as dt,json,os,sys,hashlib
from pathlib import Path
sys.path.insert(0,'infra/deploy')
from policy import validate
now=dt.datetime.now(dt.timezone.utc)
images={k:os.environ['AZURE_ACR_LOGIN_SERVER']+'/goevent/'+k+'@'+Path(f'infra/validation/release/{k}.digest').read_text() for k in ('backend','gateway')}
value=dict(schema=1,repository=os.environ['GITHUB_REPOSITORY'],commit=os.environ['GITHUB_SHA'],run_id=int(os.environ['GITHUB_RUN_ID']),created_at=now.isoformat(),expires_at=(now+dt.timedelta(days=7)).isoformat(),images=images,security_passed=True,migration_plan='plan-'+os.environ['GITHUB_SHA'],rollback_safe=os.environ.get('MIGRATION_BACKWARD_COMPATIBLE')=='true')
validate(value,os.environ['AZURE_ACR_LOGIN_SERVER'],os.environ['GITHUB_REPOSITORY'])
Path('infra/validation/release/candidate.json').write_text(json.dumps(value,indent=2)+'\n')
# Dependencies require a separate operator review; never add them to automatic app startup.
caddy_digest=Path('infra/validation/release/caddy.digest').read_text()
import re
if not re.fullmatch(r'sha256:[0-9a-f]{64}', caddy_digest):
    raise ValueError('invalid Caddy digest')
Path('infra/validation/release/caddy-candidate.json').write_text(json.dumps({
    'image':os.environ['AZURE_ACR_LOGIN_SERVER']+'/goevent/caddy@'+caddy_digest,
    'commit':value['commit'], 'run_id':value['run_id'], 'operator_approval_required':True,
},indent=2)+'\n')
Path('infra/validation/release/evidence.json').write_text(json.dumps({'workflow':os.environ['GITHUB_WORKFLOW_REF'],'reports':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('infra/validation/reports').glob('*') if p.is_file()}},indent=2))
