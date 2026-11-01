import copy,datetime as dt,fcntl,json,os,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'deploy'))
from policy import validate,trusted_run,guard_environment
from pull import preflight,deploy

class PolicyTests(unittest.TestCase):
    def setUp(self):
        now=dt.datetime.now(dt.timezone.utc)
        self.value=dict(schema=1,repository='VinuraY/goevent',commit='a'*40,run_id=1,created_at=now.isoformat(),expires_at=(now+dt.timedelta(hours=1)).isoformat(),images={k:'example.azurecr.io/goevent/'+k+'@sha256:'+'b'*64 for k in ('backend','gateway')},security_passed=True,migration_plan='review',rollback_safe=False)
    def check(self,v):
        return validate(v,'example.azurecr.io','VinuraY/goevent')
    def test_valid(self):self.check(self.value)
    def test_bad_images(self):
        for image in ['example.azurecr.io/goevent/backend:latest','example.azurecr.io/goevent/backend@sha256:no','evil.azurecr.io/goevent/backend@sha256:'+'b'*64,'example.azurecr.io/other/backend@sha256:'+'b'*64]:
            with self.subTest(image=image):
                v=copy.deepcopy(self.value);v['images']['backend']=image
                with self.assertRaises(ValueError):self.check(v)
    def test_security_and_expiry(self):
        for key,value in [('security_passed',False),('expires_at','2020-01-01T00:00:00Z'),('schema',2),('migration_plan',''),('repository','evil/fork')]:
            v=copy.deepcopy(self.value);v[key]=value
            with self.assertRaises(ValueError):self.check(v)
    def test_untrusted_promotion(self):
        with self.assertRaises(ValueError):trusted_run({'event':'pull_request'},'VinuraY/goevent')
    def test_missing_oidc(self):
        with self.assertRaises(ValueError):guard_environment({})
    def test_missing_disk(self):
        with self.assertRaises(ValueError):preflight({'enabled':True,'disk_uuid':''})
    def test_wrong_disk(self):
        with patch('pull.run',return_value=b'wrong'):
            with self.assertRaises(ValueError):preflight(dict(enabled=True,disk_uuid='expected',mysql_mount='/srv/goevent/mysql',mysql_data='/srv/goevent/mysql/data'))
    def test_no_secret_inventory(self):
        with tempfile.TemporaryDirectory() as tmp, patch('pull.run',return_value=b'expected'), patch('pull.protected',side_effect=lambda *a:Path(tmp)), patch('pull.Path.is_dir',return_value=True):
            c=dict(enabled=True,disk_uuid='expected',mysql_mount='/srv/goevent/mysql',mysql_data='/srv/goevent/mysql/data',secrets_dir=tmp,config_dir=tmp,state_dir=tmp,required_secrets=[])
            with self.assertRaises(ValueError):preflight(c)
    def test_concurrent_lock(self):
        with tempfile.TemporaryDirectory() as tmp:
            with open(tmp+'/lock','w') as first,open(tmp+'/lock','w') as second:
                fcntl.flock(first,fcntl.LOCK_EX|fcntl.LOCK_NB)
                with self.assertRaises(BlockingIOError):fcntl.flock(second,fcntl.LOCK_EX|fcntl.LOCK_NB)
    def test_invalid_manifest_never_executes(self):
        with patch('pull.run') as command:
            with self.assertRaises(ValueError):deploy({'registry':'example.azurecr.io','repository':'VinuraY/goevent'}, {})
            command.assert_not_called()

    def test_unapproved_environment(self):
        from policy import require_reviewers
        with self.assertRaises(ValueError):require_reviewers({'protection_rules':[]})
    def test_failed_scanner_rejected(self):
        import subprocess
        with tempfile.TemporaryDirectory() as tmp:
            report=Path(tmp)/'scan.json';report.write_text('{}')
            result=subprocess.run([sys.executable,str(Path(__file__).resolve().parents[1]/'ci/scan_summary.py'),str(report)],capture_output=True)
            self.assertNotEqual(result.returncode,0)
    def test_failed_health_does_not_record_success(self):
        import subprocess
        with tempfile.TemporaryDirectory() as tmp:
            approval=Path(tmp)/'approval.json'
            approval.write_text(json.dumps({'plan':'review','commit':'a'*40,'approved':True}))
            c=dict(registry='example.azurecr.io',repository='VinuraY/goevent',migration_approval=str(approval),state_dir=tmp,acr_name='example',compose_file=tmp+'/compose',health_hook=tmp+'/health')
            model={'services':{k:{'image':v,'restart':'no','user':'10001:10001','read_only':True} for k,v in self.value['images'].items()}}
            def command(args,**kwargs):
                return json.dumps(model).encode() if 'config' in args else b''
            with patch('pull.preflight'),patch('pull.protected',side_effect=lambda p,*a:Path(p)),patch('pull.run',side_effect=command),patch('pull.subprocess.run',side_effect=subprocess.CalledProcessError(1,'health')):
                with self.assertRaises(subprocess.CalledProcessError):deploy(c,self.value)
            self.assertFalse((Path(tmp)/'current.json').exists())

    def test_missing_secret_file(self):
        with tempfile.TemporaryDirectory() as tmp, patch('pull.run',return_value=b'expected'), patch('pull.protected',side_effect=lambda p,*a:Path(p)), patch('pull.Path.is_dir',return_value=True):
            c=dict(enabled=True,disk_uuid='expected',mysql_mount='/srv/goevent/mysql',mysql_data='/srv/goevent/mysql/data',secrets_dir=tmp,config_dir=tmp,state_dir=tmp,required_secrets=['absent'])
            with self.assertRaises(FileNotFoundError):preflight(c)

if __name__=='__main__':unittest.main()
