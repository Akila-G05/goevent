"""Retrieve only the candidate from an identified trusted GitHub run."""
import io
import json
import os
import subprocess
import sys
import zipfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'deploy'))
from policy import trusted_run, validate, require_reviewers

def api(path):
    return subprocess.check_output(['gh','api',path])

def main():
    run_id = os.environ['BUILD_RUN_ID']
    if not run_id.isdecimal():
        raise ValueError('run ID must be numeric')
    repo = os.environ['GITHUB_REPOSITORY']
    run = json.loads(api(f'repos/{repo}/actions/runs/{run_id}'))
    trusted_run(run, repo)
    compare = json.loads(api(f'repos/{repo}/compare/{run["head_sha"]}...main'))
    if compare['status'] not in ('ahead','identical'):
        raise ValueError('build commit is not on main')
    artifacts = json.loads(api(f'repos/{repo}/actions/runs/{run_id}/artifacts'))['artifacts']
    matches = [a for a in artifacts if a['name']=='deployment-candidate' and not a['expired']]
    if len(matches)!=1:
        raise ValueError('candidate missing or ambiguous')
    with zipfile.ZipFile(io.BytesIO(api(f'repos/{repo}/actions/artifacts/{matches[0]["id"]}/zip'))) as archive:
        info = archive.getinfo('candidate.json')
        if info.file_size > 32768:
            raise ValueError('candidate too large')
        candidate=json.loads(archive.read(info))
    validate(candidate,os.environ['AZURE_ACR_LOGIN_SERVER'],repo)
    if candidate['commit']!=run['head_sha'] or candidate['run_id']!=int(run_id):
        raise ValueError('candidate provenance mismatch')
    environment=json.loads(api(f'repos/{repo}/environments/goevent-production'))
    require_reviewers(environment)
    Path('intent.json').write_text(json.dumps(candidate,sort_keys=True)+'\n')

if __name__=='__main__':
    main()
