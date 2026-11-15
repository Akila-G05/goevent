"""Verify own-account mode switches with real HTTP/Redis and disposable data."""
import http.cookiejar
import json
import urllib.error
import urllib.request
import admin_postman_smoke
import runtime_smoke


def check(query, backend_port, gateway_port, temporary):
    admin_postman_smoke.check(query, backend_port, gateway_port, temporary)
    environment=json.loads((temporary/'postman.environment.json').read_text())
    values={value['key']:value['value'] for value in environment['values']}
    client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    base=f'http://127.0.0.1:{backend_port}/goevent/api'

    def get(path):
        with client.open(base+path,timeout=10) as response:return json.load(response)

    def post(path,body):
        token=get('/admin/auth/csrf')
        request=urllib.request.Request(base+path,data=json.dumps(body).encode(),headers={
            'Content-Type':'application/json',token['headerName']:token['token']})
        with client.open(request,timeout=10) as response:return json.load(response)

    post('/admin/auth/login',{'email':'admin@example.invalid','password':values['password']})
    before=get('/admin/auth/session')
    # Caller-supplied target IDs cannot select a different account.
    post('/admin/auth/switch-to-user',{'userId':int(values['memberId'])})
    user=get('/auth/session')
    assert user['authenticated'] and user['adminUserMode']
    assert user['userId']==before['userId']==int(values['adminId'])
    assert get('/user/data')['status'] is True
    try:
        get('/admin/accounts')
        raise AssertionError('User mode retained admin API access')
    except urllib.error.HTTPError as error:assert error.code==401
    post('/admin/auth/switch-to-admin',{})
    assert get('/admin/auth/session')['userId']==before['userId']
    post('/admin/auth/logout',{})
    assert query('SELECT role_id FROM user WHERE id='+str(int(values['adminId'])))=='3'
    print('PASS: real same-account user mode, profile access, admin denial, return and unchanged DB role',flush=True)


if __name__=='__main__':
    runtime_smoke.main(check)
