"""Syntax/schema/file-safety validation; does not touch production."""
import ast,hashlib,json,subprocess
from pathlib import Path
import yaml
from jsonschema import Draft202012Validator
Draft202012Validator.check_schema(json.loads(Path('infra/deploy/manifest.schema.json').read_text()))
for p in Path('infra').rglob('*.py'):
    if 'validation' not in p.parts: ast.parse(p.read_text(),filename=str(p))
for p in list(Path('.github/workflows').glob('*.yml'))+[Path('infra/compose/applications.yml'),Path('infra/compose/dependencies.yml')]:
    yaml.safe_load(p.read_text())
protected=Path('infra/validation/protected-files.json')
if protected.exists():
    for name,digest in json.loads(protected.read_text()).items():
        if hashlib.sha256(Path(name).read_bytes()).hexdigest()!=digest:
            raise SystemExit('READ-ONLY FILE CHANGED: '+name)
model=json.loads(subprocess.check_output(['docker','compose','-f','infra/compose/applications.yml','config','--format','json'],env=__import__('os').environ|{'BACKEND_IMAGE':'example.azurecr.io/goevent/backend@sha256:'+'a'*64,'GATEWAY_IMAGE':'example.azurecr.io/goevent/gateway@sha256:'+'b'*64},text=True))
assert set(model['services'])=={'backend','gateway'} and not model.get('volumes')
deps=json.loads(subprocess.check_output(['docker','compose','-f','infra/compose/dependencies.yml','config','--format','json'],env=__import__('os').environ|{'GOEVENT_API_DOMAIN':'staging.example.invalid'},text=True))
assert set(deps['services'])=={'redis','caddy'} and not deps.get('volumes')
for name,service in deps['services'].items():
    assert __import__('re').fullmatch(r'.+@sha256:[0-9a-f]{64}',service['image'])
    assert service['user']=='10001:10001' and service['read_only'] and service['cap_drop']==['ALL']
    assert name=='caddy' or not service.get('ports')
assert deps['networks']['application']['internal'] and deps['networks']['ingress']['internal']
staging=json.loads(subprocess.check_output(['docker','compose','-f','infra/compose/dependencies.yml','-f','infra/compose/staging.yml','config','--format','json'],env=__import__('os').environ|{'GOEVENT_API_DOMAIN':'localhost'},text=True))
assert all(port['host_ip']=='127.0.0.1' for port in staging['services']['caddy']['ports'])
print('PASS: YAML, Python, manifest schema, protected file checks')
