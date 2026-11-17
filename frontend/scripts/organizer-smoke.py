"""Reuse infrastructure isolation; never target the shared DB or send real emails."""
import http.cookiejar
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'infra/ci'))
import runtime_smoke
SITE_PORT=runtime_smoke.free_port()


def check(query,backend_port,gateway_port,temporary):
    password=secrets.token_hex(6)
    organization=int(query('SELECT id FROM organization ORDER BY id LIMIT 1'))
    def account(role,email):
        client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        base=f'http://127.0.0.1:{backend_port}/goevent/api'
        def post(path,data):
            with client.open(base+'/auth/csrf',timeout=10) as response:csrf=json.load(response)
            request=urllib.request.Request(base+path,data=json.dumps(data).encode(),headers={'Content-Type':'application/json',csrf['headerName']:csrf['token']})
            with client.open(request,timeout=10) as response:return json.load(response)
        body=dict(fname='Smoke',lname='Fixture',email=email,password=password,confirmPassword=password,roleId=str(role))
        if role==2:body.update(orgId=str(organization),position='Chair')
        result=post('/auth/register',body)
        assert result['status'] is True and result['action']=='REGISTERED',result
        assert post('/auth/manual',dict(email=email,password=password))['status'] is True
        return post
    account(2,'organizer-smoke@example.invalid')
    attendee=account(1,'user-smoke@example.invalid')
    try:
        attendee('/events',{})
        raise AssertionError('Ordinary user published an event')
    except urllib.error.HTTPError as error:assert error.code==403
    site=temporary/'frontend'
    shutil.copytree(ROOT/'frontend',site,ignore=shutil.ignore_patterns('node_modules','.next','.env*','*.tsbuildinfo'))
    (site/'node_modules').symlink_to(ROOT/'frontend/node_modules',target_is_directory=True)
    fixture=temporary/'organizer-browser.json'
    fixture.write_text(json.dumps(dict(password=password)));fixture.chmod(0o600)
    chrome_port=runtime_smoke.free_port();processes=[]
    try:
        for command,log in [(['bun','run','dev','--hostname','127.0.0.1','--port',str(SITE_PORT)],'organizer-frontend.log'),
                            (['chromium','--headless','--no-sandbox','--disable-gpu','--remote-debugging-address=127.0.0.1',f'--remote-debugging-port={chrome_port}','--user-data-dir='+str(temporary/'browser'),'about:blank'],'organizer-browser.log')]:
            with (temporary/log).open('w') as output:
                processes.append(subprocess.Popen(command,cwd=site,env=os.environ|{'BACKEND_URL':f'http://127.0.0.1:{gateway_port}'},stdout=output,stderr=output))
        for url in [f'http://127.0.0.1:{SITE_PORT}/login',f'http://127.0.0.1:{chrome_port}/json/version']:
            for _ in range(90):
                try:
                    with urllib.request.urlopen(url,timeout=10) as response:
                        if response.status==200:break
                except OSError:time.sleep(1)
            else:raise AssertionError('Isolated browser/frontend unavailable')
        subprocess.run(['bun',str(ROOT/'frontend/scripts/organizer-browser.mjs'),str(fixture),f'http://127.0.0.1:{SITE_PORT}',str(chrome_port)],check=True,timeout=240)
        assert query("SELECT COUNT(*) FROM event WHERE name='Smoke organizer listing' AND event_status_id=2 AND aproved_by IS NULL")=='1'
        assert query("SELECT COUNT(*) FROM admin_email_outbox WHERE status<>'QUEUED'")=='0'
        print('PASS: real self-service signup, ordinary-user publication denial, organizer browser publication and preserved inactive email delivery',flush=True)
    finally:
        for process in reversed(processes):
            process.terminate()
            try:process.wait(timeout=15)
            except subprocess.TimeoutExpired:process.kill();process.wait()


if __name__=='__main__':
    runtime_smoke.main(check,{'APP_CORS_ALLOWED_ORIGINS':f'http://127.0.0.1:{SITE_PORT}'})
