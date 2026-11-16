"""No Azure calls, Docker starts or production paths; generated certificates only."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'deploy'))
import bootstrap as b


def config():
    return dict(approved=True,mysql_tls_and_grants_reviewed=True,vault='test-vault',
        managed_identity_client_id='',reuse_protected_app_password=False,
        allowed_origins=['https://frontend.example.invalid'],google_client_id='fixture.apps.googleusercontent.com',
        secret_ids={name:'https://test-vault.vault.azure.net/secrets/'+name+'/'+'a'*32 for name in b.SECRET_NAMES})


class BootstrapTests(unittest.TestCase):
    def test_configuration_fails_closed(self):
        self.assertEqual(b.configuration(config()),config())
        for change in [dict(approved=False),dict(mysql_tls_and_grants_reviewed=False),
                       dict(allowed_origins=['http://localhost:3000']),dict(allowed_origins=['https://*.example.com']),
                       dict(allowed_origins=['https://example.com/path']),dict(google_client_id='secret'),
                       dict(secret_ids={}),dict(reuse_protected_app_password='true')]:
            with self.subTest(change=change),self.assertRaises(ValueError): b.configuration(config()|change)
        for suffix in ['', '/latest', '/'+('b'*32)+'?version=1']:
            value=config();value['secret_ids']['mysql-ca']='https://test-vault.vault.azure.net/secrets/mysql-ca'+suffix
            with self.assertRaises(ValueError): b.configuration(value)
        value=config();value['reuse_protected_app_password']=True;del value['secret_ids']['mysql-app-password']
        b.configuration(value)

    def test_only_pinned_enabled_versions_are_read_without_secret_arguments(self):
        identifier=config()['secret_ids']['mysql-ca']
        with patch('bootstrap.command',return_value=json.dumps(dict(id=identifier,value='private-fixture',attributes=dict(enabled=True))).encode()) as run:
            self.assertEqual(b.fetch(identifier,{}),b'private-fixture')
            self.assertNotIn('private-fixture',str(run.call_args))
        with patch('bootstrap.command',return_value=b'{"attributes":{"enabled":false}}'):
            with self.assertRaises(ValueError): b.fetch(identifier,{})

    def test_passwords_and_running_containers(self):
        for value in [b'',b'weak',b'password-with-newline\n',b' contains whitespace']:
            with self.assertRaises(ValueError): b.password(value)
        with patch('bootstrap.command',return_value=b'container'):
            with self.assertRaises(ValueError): b.stopped()
        with patch('bootstrap.command',return_value=b''): b.stopped()

    def test_reuse_reads_only_matching_protected_app_copies(self):
        with patch('bootstrap.private_read',return_value=b'fixture-application-password') as read:
            self.assertEqual(b.reused_app_password(),b'fixture-application-password')
            self.assertEqual([call.args[0] for call in read.call_args_list],list(b.APP_PASSWORD_FILES))
        with patch('bootstrap.private_read',side_effect=[b'fixture-first-password',b'fixture-second-password']):
            with self.assertRaises(ValueError): b.reused_app_password()

    def test_installer_completes_missing_files_and_never_overwrites(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)/'runtime';root.mkdir();prepared=Path(directory)/'prepared'
            values={'backend/test':b'first','gateway/test':b'second','redis/test':b'third'}
            (root/'backend').mkdir(mode=0o750)
            (root/'backend/test').write_bytes(b'first'); (root/'backend/test').chmod(0o640)
            original_inode=(root/'backend/test').stat().st_ino
            # Ownership policy has separate negative tests; fixture files use the current UID.
            with patch('bootstrap.trusted',side_effect=lambda p,**kw:Path(p)),patch('bootstrap.os.chown'):
                # Exercise publication/rollback with mocked ownership checks only.
                original=Path.stat
                def info(path,*args,**kwargs):
                    result=original(path,*args,**kwargs)
                    fields=list(result);fields[5]=10001
                    return os.stat_result(fields)
                with patch.object(Path,'stat',info), patch.object(Path,'lstat',lambda path:info(path,follow_symlinks=False)):
                    b.install(values,root,prepared)
            self.assertEqual((root/'backend/test').stat().st_ino,original_inode)
            self.assertEqual((root/'backend/test').read_bytes(),b'first')
            self.assertEqual((root/'redis/test').stat().st_mode&0o777,0o640)
            with patch('bootstrap.trusted',side_effect=lambda p,**kw:Path(p)):
                with self.assertRaises(ValueError): b.install(values|{'backend/test':b'changed'},root,Path(directory)/'next')
            self.assertEqual((root/'backend/test').stat().st_ino,original_inode)
            self.assertEqual((root/'backend/test').read_bytes(),b'first')

    def test_publication_failure_removes_only_new_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)/'runtime';root.mkdir()
            original=Path.stat
            def info(path,*args,**kwargs):
                result=list(original(path,*args,**kwargs)); result[5]=10001
                return os.stat_result(result)
            link=os.link
            def fail_second(source,target):
                if Path(target).parent.name=='gateway': raise OSError('fixture publication failure')
                link(source,target)
            with patch('bootstrap.trusted',side_effect=lambda p,**kw:Path(p)),patch('bootstrap.os.chown'), \
                 patch.object(Path,'stat',info),patch('bootstrap.os.link',side_effect=fail_second):
                with self.assertRaises(OSError): b.install({'backend/test':b'first','gateway/test':b'second'},root,Path(directory)/'prepared')
            self.assertEqual(list(root.iterdir()),[])

    def test_symlink_owner_and_mode_guards(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'value';path.write_text('fixture');path.chmod(0o644)
            with self.assertRaises(ValueError): b.private_read(path)
            link=Path(directory)/'link';link.symlink_to(path)
            with self.assertRaises(ValueError): b.trusted(link)


class CertificateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary=tempfile.TemporaryDirectory();cls.root=Path(cls.temporary.name)
        def run(*args):subprocess.run(args,cwd=cls.root,check=True,capture_output=True,timeout=30)
        run('openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout','ca.key','-out','ca.crt',
            '-days','30','-subj','/CN=Isolated test CA','-addext','basicConstraints=critical,CA:TRUE')
        for name in ['mysql','redis','wrong']:
            run('openssl','req','-new','-newkey','rsa:2048','-nodes','-keyout',name+'.key','-out',name+'.csr',
                '-subj','/CN='+name,'-addext','subjectAltName=DNS:'+name)
            run('openssl','x509','-req','-in',name+'.csr','-CA','ca.crt','-CAkey','ca.key','-CAcreateserial',
                '-out',name+'.crt','-days','14','-copy_extensions','copy')
    @classmethod
    def tearDownClass(cls):cls.temporary.cleanup()

    def test_identity_truststore_and_exact_acl_inventory(self):
        secrets={name:('fixture-'+name+'-random-value').encode() for name in b.SECRET_NAMES}
        secrets.update({'mysql-ca':(self.root/'ca.crt').read_bytes(),'redis-ca':(self.root/'ca.crt').read_bytes(),
            'mysql-server-cert':(self.root/'mysql.crt').read_bytes(),'redis-server-cert':(self.root/'redis.crt').read_bytes(),
            'redis-server-key':(self.root/'redis.key').read_bytes()})
        with tempfile.TemporaryDirectory() as directory:
            values=b.runtime_values(config(),secrets,Path(directory))
            self.assertEqual(set(values),set(b.inventory()))
            self.assertTrue(values['backend/mysql-truststore.p12'])
            acl=values['redis/redis.acl'].decode()
            self.assertNotIn('REPLACE_',acl)
            self.assertIn(hashlib.sha256(secrets['redis-health-password']).hexdigest(),acl)
            self.assertIn('-config -acl -shutdown',acl)
            self.assertEqual(values['backend/spring.datasource.password'],secrets['mysql-app-password'])
        with tempfile.TemporaryDirectory() as directory:
            secrets['redis-server-key']=(self.root/'wrong.key').read_bytes()
            with self.assertRaises(ValueError): b.runtime_values(config(),secrets,Path(directory))
            secrets['redis-server-key']=(self.root/'redis.key').read_bytes()
        with self.assertRaises(ValueError):
            b.certificate(self.root/'ca.crt',self.root/'wrong.crt','mysql')
        secrets['mysql-migration-password']=secrets['mysql-app-password']
        with tempfile.TemporaryDirectory() as directory,self.assertRaises(ValueError):
            b.runtime_values(config(),secrets,Path(directory))
