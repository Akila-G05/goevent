"""Browser and Postman verification against disposable services; no shared DB."""
import os
import subprocess
import socket
import time
import urllib.request
import admin_postman_smoke
import runtime_smoke


def check(query, backend_port, gateway_port, temporary):
    admin_postman_smoke.check(query, backend_port, gateway_port, temporary)
    # Match the existing explicit local CORS allowlist; never widen it for tests.
    site_port, chrome_port = 3000, runtime_smoke.free_port()
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', site_port))
    root = runtime_smoke.ROOT
    output = root/'infra/validation/admin-ui'
    output.mkdir(exist_ok=True)
    processes = []
    try:
        with (output/'frontend.log').open('w') as log:
            processes.append(subprocess.Popen(['bun','run','dev','--hostname','127.0.0.1','--port',str(site_port)],
                cwd=root/'frontend',env=os.environ|{'BACKEND_URL':f'http://127.0.0.1:{gateway_port}'},stdout=log,stderr=log))
        with (output/'chromium.log').open('w') as log:
            processes.append(subprocess.Popen(['chromium','--headless','--no-sandbox','--disable-gpu',
                '--remote-debugging-address=127.0.0.1',f'--remote-debugging-port={chrome_port}',
                '--user-data-dir='+str(temporary/'browser-profile'),'about:blank'],stdout=log,stderr=log))
        for path in [f'http://127.0.0.1:{site_port}/login', f'http://127.0.0.1:{chrome_port}/json/version']:
            for _ in range(60):
                try:
                    with urllib.request.urlopen(path,timeout=10) as response:
                        if response.status==200:break
                except OSError:time.sleep(1)
            else:raise RuntimeError('Browser/frontend did not become ready')
        subprocess.run(['node',str(root/'infra/tests/admin-browser.mjs'),str(temporary/'postman.environment.json'),
            f'http://127.0.0.1:{site_port}',str(chrome_port),str(output)],check=True,timeout=180)
    finally:
        for process in reversed(processes):
            process.terminate()
            try:process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                process.kill();process.wait()


if __name__=='__main__':
    runtime_smoke.main(check)
