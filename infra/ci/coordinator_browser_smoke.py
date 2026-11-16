"""Coordinator browser journeys against disposable MySQL/Redis, never shared data."""
import json
import os
import shutil
import subprocess
import urllib.request
import time
import admin_postman_smoke
import runtime_smoke

SITE_PORT = runtime_smoke.free_port()


def check(query, backend_port, gateway_port, temporary):
    # Also verifies additive compatibility of the existing admin collection.
    admin_postman_smoke.check(query, backend_port, gateway_port, temporary)
    site = temporary/'frontend'
    shutil.copytree(runtime_smoke.ROOT/'frontend', site,
        ignore=shutil.ignore_patterns('node_modules', '.next', '.env*', '*.tsbuildinfo'))
    (site/'node_modules').symlink_to(runtime_smoke.ROOT/'frontend/node_modules', target_is_directory=True)
    output = runtime_smoke.ROOT/'infra/validation/coordinator-ui'
    output.mkdir(exist_ok=True)
    chrome_port = runtime_smoke.free_port()
    processes = []
    try:
        with (output/'frontend.log').open('w') as log:
            processes.append(subprocess.Popen(['bun','run','dev','--hostname','127.0.0.1','--port',str(SITE_PORT)],
                cwd=site,env=os.environ|{'BACKEND_URL':f'http://127.0.0.1:{gateway_port}'},stdout=log,stderr=log))
        with (output/'chromium.log').open('w') as log:
            processes.append(subprocess.Popen(['chromium','--headless','--no-sandbox','--disable-gpu',
                '--remote-debugging-address=127.0.0.1',f'--remote-debugging-port={chrome_port}',
                '--user-data-dir='+str(temporary/'browser-profile'),'about:blank'],stdout=log,stderr=log))
        for url in [f'http://127.0.0.1:{SITE_PORT}/login',f'http://127.0.0.1:{chrome_port}/json/version']:
            for _ in range(90):
                try:
                    with urllib.request.urlopen(url,timeout=10) as response:
                        if response.status==200:break
                except OSError:time.sleep(1)
            else:raise RuntimeError('Isolated frontend/browser unavailable')
        subprocess.run(['node',str(runtime_smoke.ROOT/'infra/tests/coordinator-browser.mjs'),
            str(temporary/'postman.environment.json'),f'http://127.0.0.1:{SITE_PORT}',str(chrome_port),str(output)],
            check=True,timeout=300)
        assert query("SELECT COUNT(*) FROM admin_email_outbox WHERE status<>'QUEUED'")=='0'
        assert query("SELECT COUNT(*) FROM event_revision WHERE review_state='APPROVED'")=='2'
    finally:
        for process in reversed(processes):
            process.terminate()
            try:process.wait(timeout=15)
            except subprocess.TimeoutExpired:process.kill();process.wait()


if __name__=='__main__':
    runtime_smoke.main(check, {'APP_CORS_ALLOWED_ORIGINS':f'http://127.0.0.1:{SITE_PORT}'})
