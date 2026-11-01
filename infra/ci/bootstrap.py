"""Install reviewed release binaries, checking GitHub's published SHA256 asset digest."""
import hashlib,io,json,os,platform,subprocess,tarfile,urllib.request
from pathlib import Path
lock=json.loads(Path('infra/ci/tools.lock.json').read_text())
out=Path('infra/validation/bin');out.mkdir(parents=True,exist_ok=True)
if platform.machine()!='x86_64':
    raise SystemExit('bootstrap currently supports Linux x86_64 only')
for repo,pattern,binary in [('rhysd/actionlint','linux_amd64.tar.gz','actionlint'),('gitleaks/gitleaks','linux_x64.tar.gz','gitleaks'),('hadolint/hadolint','hadolint-linux-x86_64','hadolint'),('koalaman/shellcheck','linux.x86_64.tar.xz','shellcheck')]:
    version=lock[repo]
    release=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/releases/tags/{version}']))
    asset=next(a for a in release['assets'] if a['name'].endswith(pattern))
    digest=asset.get('digest','')
    if digest!='sha256:'+lock['binary_sha256'][repo]:
        raise SystemExit('OWNER ACTION REQUIRED: published SHA256 unavailable: '+repo)
    data=urllib.request.urlopen(asset['browser_download_url'],timeout=90).read()
    if hashlib.sha256(data).hexdigest()!=digest[7:]:
        raise SystemExit('asset digest mismatch')
    if pattern.endswith(('.gz','.xz')):
        with tarfile.open(fileobj=io.BytesIO(data)) as archive:
            member=next(m for m in archive.getmembers() if m.isfile() and Path(m.name).name==binary)
            data=archive.extractfile(member).read()
    (out/binary).write_bytes(data);(out/binary).chmod(0o755)
    print(repo,version,digest)
