"""Publish only complete, redacted scanner reports; never print secret matches."""
import json,sys
from pathlib import Path
value=json.loads(Path(sys.argv[1]).read_text())
if not isinstance(value.get('Results'),list) or not value.get('Metadata'):
    raise SystemExit('incomplete image scan')
secrets=False
for result in value['Results']:
    for issue in result.get('Vulnerabilities',[]):
        print(issue['Severity'],issue['VulnerabilityID'],issue['PkgName'],issue['InstalledVersion'])
    for secret in result.get('Secrets',[]):
        secrets=True
        secret['Match']='REDACTED'
        secret.pop('Code',None)
if len(sys.argv)>2:
    Path(sys.argv[2]).write_text(json.dumps(value))
if secrets:
    raise SystemExit('image secret findings (values redacted)')
