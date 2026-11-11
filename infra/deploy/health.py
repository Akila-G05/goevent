#!/usr/bin/env python3
"""Bounded private-network probes of existing endpoints; no port publishing.
Requires root, util-linux nsenter and host curl. Reads only application data.
"""
import json,subprocess,time

def probe(service,path):
    ids=subprocess.check_output(['docker','ps','--filter','label=com.docker.compose.project=goevent-app','--filter','label=com.docker.compose.service='+service,'--format','{{.ID}}'],text=True,timeout=5).split()
    if len(ids)!=1:
        raise ValueError('service missing or ambiguous')
    pid=subprocess.check_output(['docker','inspect','--format','{{.State.Pid}}',ids[0]],text=True,timeout=5).strip()
    if not pid.isdecimal() or int(pid)<1:
        raise ValueError('invalid service PID')
    port='8081' if service=='backend' else '8080'
    output=subprocess.check_output(['nsenter','--target',pid,'--net','curl','--noproxy','*','--fail','--silent','--show-error','--max-time','3','http://127.0.0.1:'+port+path],timeout=5)
    return json.loads(output)

def main():
    deadline=time.monotonic()+45
    while time.monotonic()<deadline:
        try:
            if (probe('backend','/goevent/api/test').get('status') is True
                and probe('gateway','/actuator/health').get('status')=='UP'
                and probe('gateway','/goevent/api/test').get('status') is True):
                return
        except (ValueError,subprocess.SubprocessError):
            pass
        time.sleep(2)
    raise SystemExit('application health deadline exceeded')

if __name__=='__main__':
    main()
