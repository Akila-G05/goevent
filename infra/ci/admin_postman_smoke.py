"""Run the local admin Postman collection against disposable services only."""

import json
import secrets
import subprocess
import zipfile

import runtime_smoke


def check(query, backend_port, gateway_port, temporary):
    # Reuse the installed application's BCrypt implementation, without dependencies
    # or plaintext credentials in command arguments or permanent files.
    with zipfile.ZipFile(runtime_smoke.ROOT/'backend/target/goevent-1.0-SNAPSHOT.war') as artifact:
        crypto_name, = [name for name in artifact.namelist()
            if name.startswith('WEB-INF/lib/spring-security-crypto-') and name.endswith('.jar')]
        crypto = temporary/'spring-security-crypto.jar'
        crypto.write_bytes(artifact.read(crypto_name))
        logging_name, = [name for name in artifact.namelist()
            if name.startswith('WEB-INF/lib/commons-logging-') and name.endswith('.jar')]
        (temporary/'commons-logging.jar').write_bytes(artifact.read(logging_name))
    source = temporary/'Hash.java'
    source.write_text('public class Hash { public static void main(String[] args) throws Exception { '
        'System.out.print(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder()'
        '.encode(new String(System.in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8))); }}')
    password = secrets.token_urlsafe(24)
    hashed = subprocess.run(['java', '-cp', str(temporary/'*'), str(source)], input=password,
        text=True, capture_output=True, check=True, timeout=30).stdout
    assert hashed.startswith('$2'), 'BCrypt fixture generation failed'
    ids = {}
    for role, name in [(3, 'admin'), (1, 'member'), (2, 'publisher')]:
        ids[name] = query("INSERT INTO `user`(fname,lname,email,password,registered_date,user_status_id,role_id,auth_type_id) "
            f"VALUES('Postman','Fixture','{name}@example.invalid','{hashed}',UTC_TIMESTAMP(),1,{role},2); SELECT LAST_INSERT_ID();")
    organization = query('SELECT id FROM organization ORDER BY id LIMIT 1')
    query("INSERT INTO venue(name,address,city,link) VALUES('Postman',NULL,'Colombo',NULL); SET @v=LAST_INSERT_ID(); "
        "INSERT INTO img(path,bannerpath) VALUES('fixture.png',NULL); SET @i=LAST_INSERT_ID(); "
        "INSERT INTO link(link_name,link) VALUES('Postman','https://example.invalid'); SET @l=LAST_INSERT_ID(); "
        "INSERT INTO `event`(name,category_id,venue_id,event_status_id,audience_id,event_level_id,img_id,link_id,published_by,aproved_by) "
        f"VALUES('Postman',1,@v,1,1,1,@i,@l,{ids['publisher']},NULL);")
    event = query("SELECT id FROM `event` WHERE name='Postman'")
    # Booking prevents destructive event deletion and exercises the real FK guard.
    query(f"INSERT INTO booking(user_id,event_id,booking_reference,total_amount,created_at) VALUES({ids['member']},{event},'POSTMAN',12.50,UTC_TIMESTAMP());")
    values = {'baseUrl': f'http://127.0.0.1:{backend_port}/goevent/api',
        'gatewayUrl': f'http://127.0.0.1:{gateway_port}/goevent/api',
        'password': password, 'organizationId': organization, 'eventId': event,
        'adminId': ids['admin'], 'memberId': ids['member']}
    environment = temporary/'postman.environment.json'
    environment.write_text(json.dumps({'name':'Disposable admin test', 'values':[
        {'key':key,'value':value,'enabled':True} for key,value in values.items()]}))
    environment.chmod(0o600)
    subprocess.run(['postman', 'collection', 'run',
        str(runtime_smoke.ROOT/'infra/tests/postman/admin.postman_collection.json'),
        '--environment', str(environment), '--no-report-events', '--delay-request', '150',
        '--timeout-request', '10000', '--timeout', '180000'], check=True, timeout=210)
    assert int(query('SELECT COUNT(*) FROM admin_audit')) > 0
    assert int(query('SELECT COUNT(*) FROM admin_email_outbox')) > 0
    assert query("SELECT COUNT(*) FROM admin_email_outbox WHERE status<>'QUEUED'") == '0'
    assert query(f"SELECT COUNT(*) FROM booking WHERE event_id={event}") == '1'
    print('PASS: Postman mutations audited, emails queued without delivery, linked booking preserved', flush=True)


if __name__ == '__main__':
    runtime_smoke.main(check)
