"""Exercise the actual publisher with isolated CLI doubles; no Azure/Docker access."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SHA = 'a' * 40
DIGEST = 'sha256:' + 'b' * 64

FAKE = '''import json,os,sys
from pathlib import Path
name=Path(sys.argv[0]).name
args=sys.argv[1:]
with open(os.environ['COMMAND_LOG'],'a') as log:log.write(json.dumps([name,*args])+'\\n')
scenario=os.environ['SCENARIO']
if name=='gh':print('{"protected":true}')
if name=='az':
 if args[:3]==['acr','repository','show-tags']:
  repository=args[args.index('--repository')+1]
  if scenario=='missing' or (scenario=='mixed' and repository.endswith('backend')):
   print('ERROR: repository "'+repository+'" is not found',file=sys.stderr);sys.exit(1)
  if scenario=='missing_formatted':
   print('ERROR: 2026-11-12 05:58:53.399463 Error: repository \"'+repository+'\" is not found. Correlation ID: 8cc4a22a-33aa-467c-84e1-853fe5770b52.',file=sys.stderr);sys.exit(1)
  errors={
   'denied':'ERROR: denied: requested access to the resource is denied',
   'authentication':'ERROR: UNAUTHORIZED: authentication required',
   'network':'ERROR: connection timed out',
   'unexpected':'ERROR: unexpected registry response 500',
   'registry_missing':'ERROR: registry "acrgoevent" is not found',
   'wrong_repo':'ERROR: repository "other/backend" is not found',
   'mixed_error':'ERROR: repository "'+repository+'" is not found\\nERROR: Forbidden',
  }
  if scenario in errors:print(errors[scenario],file=sys.stderr);sys.exit(1)
  if scenario=='partial':
   print('[]');print('ERROR: repository "'+repository+'" is not found',file=sys.stderr);sys.exit(1)
  if scenario=='malformed':print('not JSON')
  elif scenario=='object':print('{}')
  elif scenario=='null':print('null')
  elif scenario=='nonstring':print('[42]')
  elif scenario=='existing':print(json.dumps([os.environ['GITHUB_SHA']]))
  else:print('[\"older-tag\"]')
 elif args[:3]==['acr','repository','show']:
  if scenario=='digest_denied':print('ERROR: denied',file=sys.stderr);sys.exit(1)
  print('invalid' if scenario=='bad_digest' else 'sha256:'+'b'*64)
 elif args[:2]==['acr','login'] and scenario=='login_denied':sys.exit(1)
'''


class PublishTests(unittest.TestCase):
    def invoke(self, scenario):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        for relative in ['infra/ci/publish.sh', 'infra/ci/acr_tags.py',
                         'infra/ci/candidate.py', 'infra/deploy/policy.py']:
            destination = root / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / relative, destination)
        binary = root / 'bin'
        binary.mkdir()
        for tool in ['az', 'gh', 'docker']:
            executable = binary / tool
            executable.write_text('#!' + sys.executable + '\n' + FAKE)
            executable.chmod(0o755)
        output = root / 'outputs'
        output.touch()
        env = os.environ | {
            'PATH': str(binary) + os.pathsep + os.environ['PATH'],
            'COMMAND_LOG': str(root / 'commands'), 'SCENARIO': scenario,
            'AZURE_CLIENT_ID': 'test', 'AZURE_TENANT_ID': 'test',
            'AZURE_SUBSCRIPTION_ID': 'test', 'AZURE_ACR_NAME': 'acrgoevent',
            'AZURE_ACR_LOGIN_SERVER': 'acrgoevent.azurecr.io',
            'GITHUB_SHA': SHA, 'GITHUB_REPOSITORY': 'VinuraY/goevent',
            'GITHUB_RUN_ID': '123', 'GITHUB_WORKFLOW_REF': 'test-workflow',
            'GITHUB_OUTPUT': str(output),
        }
        result = subprocess.run(['sh', 'infra/ci/publish.sh'], cwd=root, env=env,
                                capture_output=True, text=True, timeout=30)
        commands = [json.loads(line) for line in (root / 'commands').read_text().splitlines()]
        return result, root, commands

    def test_first_publication(self):
        result, root, commands = self.invoke('missing')
        self.assertEqual(result.returncode, 0, result.stderr)
        pushes = [c for c in commands if c[:2] == ['docker', 'push']]
        self.assertEqual(pushes, [['docker', 'push', f'acrgoevent.azurecr.io/goevent/{c}:{SHA}']
                                 for c in ['backend', 'gateway']])
        candidate = json.loads((root / 'infra/validation/release/candidate.json').read_text())
        self.assertEqual(candidate['images']['backend'], 'acrgoevent.azurecr.io/goevent/backend@' + DIGEST)
        self.assertEqual(candidate['images']['gateway'], 'acrgoevent.azurecr.io/goevent/gateway@' + DIGEST)
        self.assertEqual((root / 'outputs').read_text(), f'backend={DIGEST}\ngateway={DIGEST}\n')
        lookups = [c for c in commands if c[:4] == ['az', 'acr', 'repository', 'show']]
        self.assertEqual(len(lookups), 2)
        self.assertTrue(all('--image' in c for c in lookups))
        self.assertFalse(any('list' in c for c in commands))

    def test_first_publication_with_azure_cli_formatted_error(self):
        result, _, commands = self.invoke('missing_formatted')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len([c for c in commands if c[:2] == ['docker', 'push']]), 2)

    def test_existing_repository_with_unused_tag(self):
        result, _, _ = self.invoke('empty')
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_missing_and_existing_repository_pair(self):
        result, _, _ = self.invoke('mixed')
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_existing_tag_rejected(self):
        result, root, commands = self.invoke('existing')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('commit tag already exists', result.stderr)
        self.assertFalse(any(c[:2] == ['docker', 'push'] for c in commands))
        self.assertFalse((root / 'infra/validation/release/candidate.json').exists())

    def test_registry_failures_stop_before_push(self):
        for scenario in ['denied', 'authentication', 'network', 'unexpected',
                         'registry_missing', 'wrong_repo', 'mixed_error', 'partial',
                         'malformed', 'object', 'null', 'nonstring', 'login_denied']:
            with self.subTest(scenario=scenario):
                result, root, commands = self.invoke(scenario)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(any(c[:2] == ['docker', 'push'] for c in commands))
                self.assertEqual((root / 'outputs').read_text(), '')
                self.assertFalse((root / 'infra/validation/release/candidate.json').exists())

    def test_invalid_or_denied_digest_stops_release(self):
        for scenario in ['bad_digest', 'digest_denied']:
            with self.subTest(scenario=scenario):
                result, root, commands = self.invoke(scenario)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual((root / 'outputs').read_text(), '')
                self.assertFalse((root / 'infra/validation/release/candidate.json').exists())
                self.assertEqual(len([c for c in commands if c[:2] == ['docker', 'push']]), 1)


if __name__ == '__main__':
    unittest.main()
