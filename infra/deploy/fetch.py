"""Owner-approved private Blob adapter. No listing/latest selection or activation."""
import hashlib,json,os,subprocess,tempfile
from pathlib import Path
from pull import protected
from policy import validate, validate_blob_policy

def main():
    if os.geteuid()!=0:
        raise ValueError('root required')
    c=json.loads(protected('/etc/goevent-release/policy.json').read_text())
    validate_blob_policy(c)
    if not c['enabled']:
        raise ValueError('OWNER ACTION REQUIRED: approve exact immutable intent blob')
    subprocess.run(['az','login','--identity','--output','none'],check=True,timeout=60,capture_output=True)
    with tempfile.TemporaryDirectory(dir='/run') as tmp:
        target=Path(tmp)/'intent.json'
        subprocess.run(['az','storage','blob','download','--auth-mode','login','--account-name',c['storage_account'],'--container-name',c['storage_container'],'--name',c['approved_blob'],'--file',str(target),'--output','none'],check=True,timeout=60,capture_output=True)
        if target.stat().st_size>32768:
            raise ValueError('intent oversized')
        if hashlib.sha256(target.read_bytes()).hexdigest() != c['approved_intent_sha256']:
            raise ValueError('approved intent content mismatch')
        validate(json.loads(target.read_text()),c['registry'],c['repository'])
        staged=Path('/run/goevent-release-intent.pending')
        staged.write_bytes(target.read_bytes());staged.chmod(0o600);staged.replace('/run/goevent-release-intent.json')
if __name__=='__main__':
    main()
