"""Regenerate after reviewed requirements install; preserve PyPI artifact hashes."""
import concurrent.futures,json,subprocess,urllib.request
from pathlib import Path
lines=subprocess.check_output(['infra/validation/.venv/bin/pip','freeze'],text=True).splitlines()
def lock(line):
    name,version=line.split('==')
    data=json.load(urllib.request.urlopen(f'https://pypi.org/pypi/{name}/{version}/json',timeout=30))
    hashes=sorted({a['digests']['sha256'] for a in data['urls']})
    if not hashes:raise ValueError('no artifact hashes for '+line)
    return line+' \\\n'+ ' \\\n'.join('    --hash=sha256:'+h for h in hashes)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    values=list(pool.map(lock,lines))
Path('infra/ci/requirements.lock').write_text('--require-hashes\n'+ '\n'.join(values)+'\n')
