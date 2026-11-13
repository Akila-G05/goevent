#!/usr/bin/env python3
"""Stop only GoEvent application/dependency containers; never touch MySQL."""
import os
import subprocess

if __name__ == '__main__':
    if os.geteuid() != 0:
        raise SystemExit('root required')
    # Stop ingress first, then apps, then ephemeral Redis. No network/volume removal.
    for project, services in [('goevent-dependencies', ['caddy']),
                              ('goevent-app', ['gateway', 'backend']),
                              ('goevent-dependencies', ['redis'])]:
        for service in services:
            ids = subprocess.check_output(['docker', 'ps', '-q', '--filter',
                'label=com.docker.compose.project='+project, '--filter',
                'label=com.docker.compose.service='+service], text=True, timeout=10).split()
            if ids:
                subprocess.run(['docker', 'stop', '--time', '30', *ids], check=True, timeout=45)
