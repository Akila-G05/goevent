"""Reject existing commit tags; tolerate only ACR's exact absent-repository error."""
import json
import os
import re
import subprocess
import sys


def main():
    repository = sys.argv[1]
    commit = os.environ['GITHUB_SHA']
    if not re.fullmatch(r'[0-9a-f]{40}', commit):
        raise SystemExit('invalid commit SHA')
    result = subprocess.run(
        ['az', 'acr', 'repository', 'show-tags', '--name', os.environ['AZURE_ACR_NAME'],
         '--repository', repository, '--only-show-errors', '-o', 'json'],
        capture_output=True, text=True, timeout=120,
    )
    if result.returncode:
        # Full-match, including the requested repository: never swallow denied
        # access, registry-not-found, network errors, warnings or partial results.
        prefix = r'(?:ERROR: )?(?:\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6} Error: )?'
        suffix = r'(?: Correlation ID: [0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\.)?'
        missing = prefix + r'repository "' + re.escape(repository) + r'" is not found\.?' + suffix
        if not result.stdout.strip() and re.fullmatch(missing, result.stderr.strip()):
            print(f'{repository}: first publication (repository absent)')
            return
        raise SystemExit(f'{repository}: tag lookup failed (exit {result.returncode}); publication stopped')
    if result.stderr.strip():
        raise SystemExit('unexpected registry diagnostics')
    tags = json.loads(result.stdout)
    if not isinstance(tags, list) or not all(isinstance(tag, str) for tag in tags):
        raise SystemExit('unexpected registry tag-list response')
    if commit in tags:
        raise SystemExit('commit tag already exists')


if __name__ == '__main__':
    main()
