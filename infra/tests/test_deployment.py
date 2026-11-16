"""Fault-injection tests: never contact Azure, start services or touch production data."""
import copy
import datetime as dt
import json
from pathlib import Path
import subprocess
import stat
from types import SimpleNamespace
import sys
import tempfile
import unittest
from unittest.mock import patch
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'deploy'))
from pull import deploy, validate_model, network_preflight, protected_tree, upload_preflight
from policy import validate_blob_policy
ROOT = Path(__file__).resolve().parents[2]


def model(images):
    value = yaml.safe_load((ROOT / 'infra/compose/applications.yml').read_text())
    for name, image in images.items():
        value['services'][name]['image'] = image
    return value


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        now = dt.datetime.now(dt.timezone.utc)
        self.intent = dict(schema=1, repository='VinuraY/goevent', commit='a'*40, run_id=1,
            created_at=now.isoformat(), expires_at=(now+dt.timedelta(hours=1)).isoformat(),
            images={k: 'acrgoevent.azurecr.io/goevent/'+k+'@sha256:'+'b'*64 for k in ('backend','gateway')},
            security_passed=True, migration_plan='review', rollback_safe=False)

    def test_compose_prevents_db_replacement_and_public_apps(self):
        valid = model(self.intent['images'])
        validate_model(valid, self.intent['images'])
        variants = []
        value = copy.deepcopy(valid); value['services']['mysql'] = {}; variants.append(value)
        value = copy.deepcopy(valid); value['services']['backend']['ports'] = ['8081:8081']; variants.append(value)
        value = copy.deepcopy(valid); value['networks']['database']['name'] = 'replacement'; variants.append(value)
        value = copy.deepcopy(valid); value['services']['gateway']['networks']['database'] = {}; variants.append(value)
        value = copy.deepcopy(valid); value['services']['backend']['volumes'][0]['read_only'] = False; variants.append(value)
        for value in variants:
            with self.assertRaises(ValueError): validate_model(value, self.intent['images'])

    def test_upload_bind_is_the_only_writable_persistent_mount(self):
        valid = model(self.intent['images'])
        mount = valid['services']['backend']['volumes'][2]
        self.assertEqual(mount['source'], '/var/lib/goevent-uploads')
        self.assertEqual(mount['target'], '/app/uploads')
        self.assertFalse(mount['read_only'])
        for changed in [dict(source='/srv/goevent/mysql/data'), dict(target='/app'),
                        dict(read_only=True), dict(type='volume'),
                        dict(bind={'create_host_path': True}),
                        dict(bind={'create_host_path': False, 'propagation': 'shared'})]:
            value = copy.deepcopy(valid)
            value['services']['backend']['volumes'][2].update(changed)
            with self.assertRaises(ValueError): validate_model(value,self.intent['images'])
        value = copy.deepcopy(valid)
        value['services']['backend']['volumes'][1] = value['services']['backend']['volumes'][0]
        with self.assertRaises(ValueError): validate_model(value,self.intent['images'])
        value = copy.deepcopy(valid)
        value['services']['gateway']['volumes'].append(copy.deepcopy(mount))
        with self.assertRaises(ValueError): validate_model(value,self.intent['images'])
        self.assertIn('app.storage.root=/app/uploads',
            (ROOT/'infra/config/backend/application.properties').read_text())

    def test_upload_permissions_symlinks_and_mysql_filesystem_fail_closed(self):
        uuid = '11111111-1111-1111-1111-111111111111'
        good = dict(st_mode=stat.S_IFDIR|0o700,st_uid=10001,st_gid=10001,st_dev=2)
        for changed in [{},dict(st_mode=stat.S_IFDIR|0o755),dict(st_uid=0),
                        dict(st_gid=0),dict(st_mode=stat.S_IFLNK|0o700),dict(st_dev=1)]:
            info = SimpleNamespace(**(good|changed))
            with patch('pull.protected'), patch.object(Path,'is_symlink',return_value=False), \
                 patch.object(Path,'lstat',return_value=info), \
                 patch.object(Path,'stat',return_value=SimpleNamespace(st_dev=1)), \
                 patch('pull.run',return_value=uuid.encode()):
                if changed:
                    with self.assertRaises(ValueError): upload_preflight('/var/lib/goevent-uploads','/srv/goevent/mysql/data',uuid)
                else:
                    upload_preflight('/var/lib/goevent-uploads','/srv/goevent/mysql/data',uuid)
        with patch('pull.protected'), patch.object(Path,'is_symlink',return_value=False), \
             patch.object(Path,'lstat',return_value=SimpleNamespace(**good)), \
             patch.object(Path,'stat',return_value=SimpleNamespace(st_dev=1)), patch('pull.run',return_value=b''):
            with self.assertRaises(ValueError): upload_preflight('/var/lib/goevent-uploads','/srv/goevent/mysql/data',uuid)
        for invalid in ['', 'OWNER_ACTION_REQUIRED']:
            with self.assertRaises(ValueError): upload_preflight('/var/lib/goevent-uploads','/srv/goevent/mysql/data',invalid)
        with patch('pull.protected'), patch.object(Path,'is_symlink',return_value=True):
            with self.assertRaises(ValueError): upload_preflight('/var/lib/goevent-uploads','/srv/goevent/mysql/data',uuid)
        with tempfile.TemporaryDirectory() as directory, patch('pull.protected'):
            with self.assertRaises(FileNotFoundError): upload_preflight(Path(directory)/'missing',directory,uuid)

    def test_dependency_contract(self):
        dependencies = yaml.safe_load((ROOT/'infra/compose/dependencies.yml').read_text())
        self.assertEqual(set(dependencies['services']), {'redis', 'caddy'})
        for name, service in dependencies['services'].items():
            if name == 'caddy':
                self.assertEqual(service['image'], '${CADDY_IMAGE:?reviewed acrgoevent.azurecr.io/goevent/caddy digest required}')
            else:
                self.assertRegex(service['image'], r'@sha256:[0-9a-f]{64}$')
            self.assertEqual(service['restart'], 'no')
            if name != 'caddy': self.assertFalse(service.get('ports'))
        redis = (ROOT/'infra/compose/redis.conf.example').read_text()
        for setting in ['port 0', 'tls-port 6379', 'maxmemory 256mb', 'maxmemory-policy noeviction', 'appendonly no']:
            self.assertIn(setting, redis)
        self.assertTrue(dependencies['networks']['application']['internal'])
        self.assertTrue(dependencies['networks']['ingress']['internal'])

    def test_network_flags_and_missing_network_fail_closed(self):
        def inspect(args):
            return json.dumps([dict(Driver='bridge', Internal=True, Attachable=False)]).encode()
        with patch('pull.run', side_effect=inspect): network_preflight()
        with patch('pull.run', return_value=b'[{"Driver":"overlay","Internal":true,"Attachable":false}]'):
            with self.assertRaises(ValueError): network_preflight()
        with patch('pull.run', side_effect=subprocess.CalledProcessError(1, 'network')):
            with self.assertRaises(subprocess.CalledProcessError): network_preflight()

    def test_only_exact_blob_and_approved_content_hash(self):
        valid = dict(storage_account='stgoevent', storage_container='goevent-release-intents',
                     approved_blob='intents/123-456.json', approved_intent_sha256='a'*64)
        validate_blob_policy(valid)
        for name in ['intents/latest.json', 'intents/../123-456.json', 'intents/123-456.json?version=1', '*']:
            with self.assertRaises(ValueError): validate_blob_policy(valid | {'approved_blob': name})
        with self.assertRaises(ValueError): validate_blob_policy(valid | {'approved_intent_sha256': ''})

    def test_runtime_tree_rejects_unprotected_owner_or_permissions(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError): protected_tree(directory)

    def exercise(self, failure, rollback=False, approval=True, rollback_failure=False):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory)
            migration = state / 'approval.json'
            migration.write_text(json.dumps(dict(plan='review', commit='a'*40, approved=approval, rollback_safe=rollback)))
            c = dict(registry='acrgoevent.azurecr.io', repository='VinuraY/goevent',
                     migration_approval=str(migration), state_dir=directory, acr_name='acrgoevent',
                     compose_file='applications.yml', health_hook='health')
            intent = self.intent | {'rollback_safe': rollback}
            old = copy.deepcopy(self.intent)
            old['commit'] = 'c'*40
            if rollback:
                (state/'current.json').write_text(json.dumps(old))
            commands = []
            up_count = 0
            def command(args, **kwargs):
                nonlocal up_count
                commands.append((args, kwargs))
                if 'config' in args: return json.dumps(model(intent['images'])).encode()
                if 'verify' in args and failure == 'attestation': raise subprocess.CalledProcessError(1, args)
                if 'pull' in args and failure == 'network': raise subprocess.CalledProcessError(1, args)
                if 'up' in args:
                    up_count += 1
                    if (up_count == 1 and failure in ('startup','migration')) or (up_count == 2 and rollback_failure):
                        raise subprocess.CalledProcessError(1, args)
                return b''
            with patch('pull.preflight'), patch('pull.protected', side_effect=lambda p,*a:Path(p)), \
                 patch('pull.run', side_effect=command), patch('pull.subprocess.run') as hook:
                if failure == 'health': hook.side_effect = [subprocess.CalledProcessError(1,'health'), None]
                with self.assertRaises((ValueError, subprocess.SubprocessError)):
                    deploy(c, intent)
            if rollback:
                self.assertEqual(json.loads((state/'current.json').read_text()), old)
            else:
                self.assertFalse((state/'current.json').exists())
            return commands, up_count

    def test_invalid_attestation_and_pull_failure_never_start(self):
        for failure in ('attestation', 'network'):
            commands, starts = self.exercise(failure)
            self.assertEqual(starts, 0)
            if failure == 'attestation':
                verification = next(args for args,_ in commands if 'verify' in args)
                for option in ('--source-digest', '--source-ref', '--signer-workflow', '--deny-self-hosted-runners'):
                    self.assertIn(option, verification)

    def test_startup_and_failed_migration_stop_unapproved_first_release(self):
        # A migration startup error is surfaced by Compose as an unhealthy/exited backend.
        for failure in ('startup','migration','health'):
            commands, _ = self.exercise(failure)
            self.assertTrue(any('stop' in args for args,_ in commands))
            startup = next((args, kw) for args,kw in commands if 'up' in args)
            self.assertGreater(startup[1]['timeout'], int(startup[0][startup[0].index('--wait-timeout')+1]))

    def test_commit_approval_required_before_any_pull(self):
        commands, starts = self.exercise('approval', approval=False)
        self.assertEqual(commands, [])
        self.assertEqual(starts, 0)

    def test_successful_and_failed_rollback_never_record_failed_release(self):
        for fails in (False, True):
            _, starts = self.exercise('startup', rollback=True, rollback_failure=fails)
            self.assertEqual(starts, 2)
