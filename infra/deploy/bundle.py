#!/usr/bin/env python3
"""Package reviewed infrastructure; install inert files only, never enable services."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import tarfile
from pull import protected

ROOT = Path(__file__).resolve().parents[2]
GROUPS = ('compose', 'config', 'deploy', 'systemd', 'docs')


def pack(destination):
    files = {}
    for group in GROUPS:
        for path in sorted((ROOT/'infra'/group).rglob('*')):
            if '__pycache__' in path.parts or path.suffix == '.pyc': continue
            if path.is_symlink(): raise ValueError('symlink in bundle source')
            if path.is_file(): files[str(path.relative_to(ROOT/'infra'))] = path.read_bytes()
    policy = json.loads(files['deploy/operator-policy.example.json'])
    if policy['enabled'] is not False: raise ValueError('bundle operator policy must remain disabled')
    manifest = {name: hashlib.sha256(data).hexdigest() for name,data in files.items()}
    files['SHA256SUMS.json'] = (json.dumps(manifest, sort_keys=True, indent=2)+'\n').encode()
    with tarfile.open(destination, 'x') as archive:
        for name, data in files.items():
            entry = tarfile.TarInfo(name)
            entry.size = len(data); entry.uid = entry.gid = 0; entry.mode = 0o640
            archive.addfile(entry, io.BytesIO(data))
    print(hashlib.sha256(Path(destination).read_bytes()).hexdigest())


def inspect(archive):
    files = {}
    with tarfile.open(archive, 'r') as source:
        for entry in source:
            path = PurePosixPath(entry.name)
            if (not entry.isfile() or path.is_absolute() or '..' in path.parts
                or (path.parts[0] not in GROUPS and entry.name != 'SHA256SUMS.json')
                or entry.name in files or entry.size > 1048576):
                raise ValueError('unsafe bundle member')
            files[entry.name] = source.extractfile(entry).read()
            if len(files) > 200: raise ValueError('bundle too large')
    hashes = json.loads(files.pop('SHA256SUMS.json'))
    if hashes != {name:hashlib.sha256(data).hexdigest() for name,data in files.items()}:
        raise ValueError('bundle integrity mismatch')
    if json.loads(files['deploy/operator-policy.example.json'])['enabled'] is not False:
        raise ValueError('deployment must remain disabled')
    return files


def stage(archive, digest, release):
    if os.geteuid() != 0: raise ValueError('root required')
    archive = protected(archive)
    if not re.fullmatch(r'[0-9a-f]{64}', digest) or hashlib.sha256(archive.read_bytes()).hexdigest() != digest:
        raise ValueError('archive does not match independently reviewed SHA-256')
    files = inspect(archive)
    base = protected('/opt/goevent/releases', True)
    if not re.fullmatch(r'review-[a-z0-9-]{1,64}', release): raise ValueError('invalid review directory')
    destination = base/release
    destination.mkdir(mode=0o700)  # Never overwrite an installed bundle or current link.
    for name,data in files.items():
        path = destination/name
        path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        path.write_bytes(data); path.chmod(0o600)
    (destination/'deploy/health.py').chmod(0o700)
    print('Staged disabled bundle at '+str(destination)+'; no service/policy/current-link changes')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest='command', required=True)
    pack_args = commands.add_parser('pack'); pack_args.add_argument('archive')
    check_args = commands.add_parser('inspect'); check_args.add_argument('archive')
    stage_args = commands.add_parser('stage'); stage_args.add_argument('archive')
    stage_args.add_argument('--sha256', required=True); stage_args.add_argument('--release', required=True)
    args = parser.parse_args()
    if args.command == 'pack': pack(args.archive)
    elif args.command == 'inspect': print('PASS: '+str(len(inspect(args.archive)))+' inert bundle files verified')
    else: stage(args.archive, args.sha256, args.release)
