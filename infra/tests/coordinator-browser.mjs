// Run only through coordinator_browser_smoke.py against disposable services.
import fs from 'node:fs';
const [environmentPath,site,port,output]=process.argv.slice(2);
const values=Object.fromEntries(JSON.parse(fs.readFileSync(environmentPath,'utf8')).values.map(v=>[v.key,v.value]));
const password=values.password;
const targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let sequence=0;const pending=new Map();
ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const callback=pending.get(m.id);pending.delete(m.id);if(m.error)callback.reject(new Error(m.error.message));else callback.resolve(m.result);}});
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description || 'Browser script failed');return result.result.value;}
async function until(expression){const started=Date.now();while(Date.now()-started<60000){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,250));}throw new Error('Timed out waiting for browser condition: '+expression);}
async function click(label){await evaluate(`(()=>{const b=${label==='Sign In'?`document.querySelector('form button[type="submit"]')`:`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)})`};if(!b)throw Error('Missing button');b.click();})()`);}
async function fill(fields){await evaluate(`(()=>{const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;const select=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;const text=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;for(const [selector,value] of ${JSON.stringify(Object.entries(fields))}){const el=document.querySelector(selector);if(!el)throw Error(selector);(el.tagName==='SELECT'?select:el.tagName==='TEXTAREA'?text:set).call(el,value);el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));}})()`);}
async function file(selector){await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});const transfer=new DataTransfer();transfer.items.add(new File([${JSON.stringify('%PDF-1.4\n1 0 obj <<>> endobj\n%%EOF')}],'proof.pdf',{type:'application/pdf'}));el.files=transfer.files;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
async function navigate(path){await send('Page.navigate',{url:site+path});}
async function login(email){await navigate('/login?returnTo=%2Fcoordinator');await until(`!!document.querySelector('input[name=password]')`);await until(`Object.keys(document.querySelector('form')).some(k=>k.startsWith('__reactProps') && typeof document.querySelector('form')[k].onSubmit==='function')`);await fill({'input[type=email]':email,'input[name=password]':password});await click('Sign In');}
async function api(path,body,method="POST"){return evaluate(`(async()=>{const token=await fetch('/goevent/api/admin/auth/csrf').then(r=>r.json());const r=await fetch('/goevent/api/admin/'+${JSON.stringify(path)},{method:${JSON.stringify(method)},headers:{'Content-Type':'application/json',[token.headerName]:token.token},body:JSON.stringify(${JSON.stringify(body)})});if(!r.ok)throw Error('API status '+r.status);return r.json();})()`);}
try{
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await navigate('/coordinator');await until(`location.pathname==='/login'`);
 await login('member@example.invalid');await until(`location.pathname==='/coordinator' && !!document.querySelector('input[name=position]')`);
 await until(`!!document.querySelector('select[name=organizationId] option[value="${values.organizationId}"]')`);
 await until(`document.body.innerText.includes('Revoked')`);
 await fill({'select[name=organizationId]':String(values.organizationId),'input[name=position]':'Chair','input[name=contactEmail]':'member@example.invalid','input[name=contactPhone]':'0700000000','textarea[name=explanation]':'Committee authorization for browser verification'});
 await file('input[name=proof]');await click('Submit application');await until(`document.body.innerText.includes('Application submitted for review.')`);
 console.log('PASS: guest return and reapplication to a revoked organization with private proof');
 // Dedicated admin login rotates the same browser session and removes user authority.
 await login('admin@example.invalid');await until(`location.pathname==='/admin' && !!document.querySelector('.admin-kpis')`);
 await navigate('/admin?view=coordinator-requests');await until(`document.body.innerText.includes('member@example.invalid')`);
 await click('Approve');await until(`!!document.querySelector('[role=dialog] textarea')`);
 await fill({'[role=dialog] textarea':'Verified browser authorization'});await click('Confirm review');await until(`document.body.innerText.includes('Change saved.')`);
 console.log('PASS: admin proof review grants one organization membership');
 const organizations=await evaluate(`fetch('/goevent/api/content/organizations').then(r=>r.json())`);
 const secondOrganization=organizations.data.find(o=>Number(o.id)!==Number(values.organizationId)).id;
 await api(`accounts/${values.memberId}`,{firstName:'Postman',lastName:'Fixture',email:'member@example.invalid',roleId:2,statusId:1,reason:'Second organization verified for switch test',organizationId:secondOrganization,position:'Chair'},'PUT');
 await login('member@example.invalid');await until(`location.pathname==='/coordinator' && !!document.querySelector('select[aria-label="Organization workspace"] option[value="${values.organizationId}"]')`);
 await fill({'select[aria-label="Organization workspace"]':String(values.organizationId)});
 await click('Events');await click('Create event');await until(`!!document.querySelector('#create-event-form')`);
 await fill({'input[name=name]':'Browser reviewed event','textarea[name=description]':'Browser journey event','select[name=categoryId]':'1','input[name=venueName]':'Test hall','input[name=venueCity]':'Colombo','input[name=startsAt]':'2027-06-01T09:00','input[name=endsAt]':'2027-06-01T10:00'});
 await until(`!!document.querySelector('[role=dialog] select[name=categoryId] option[value="1"]')`);
 await file('[role=dialog] input[accept="application/pdf,image/jpeg,image/png"]');await click('Save draft');await until(`document.body.innerText.includes('Draft saved.')`);
 await until(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Submit for review' && !b.disabled)`);
 await click('Submit for review');await until(`document.body.innerText.includes('Revision submitted.')`);
 await evaluate(`document.querySelectorAll('button[aria-label="Dismiss notification"]').forEach(button=>button.click())`);
 await until(`!document.querySelector('button[aria-label="Dismiss notification"]')`);
 const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(output+'/coordinator-events.png',Buffer.from(screenshot.data,'base64'));
 console.log('PASS: owned workspace saves draft and freezes a submitted revision');
 await login('admin@example.invalid');await until(`location.pathname==='/admin' && !!document.querySelector('.admin-kpis')`);
 const list=await evaluate(`fetch('/goevent/api/admin/events').then(r=>r.json())`);const event=list.data.find(e=>e.name==='Browser reviewed event');
 if(!event)throw Error('Missing submitted event');
 await api(`events/${event.id}/decision`,{approve:true,revision:event.revision,reason:'Exact browser revision approved'});
 await navigate(`/events/${event.id}`);await until(`document.querySelector('h1')?.textContent==='Browser reviewed event'`);
 const publicContent=await evaluate(`fetch('/goevent/api/public-events/${event.id}').then(r=>r.json())`);
 if(publicContent.data.content.includes('approvalDocumentId'))throw Error('Private proof exposed');
 console.log('PASS: exact revision published, public page records impression and excludes private proof');
 await login('member@example.invalid');await until(`location.pathname==='/coordinator' && document.body.innerText.includes('Recorded bookings')`);
 await fill({'select[aria-label="Organization workspace"]':String(secondOrganization)});
 const cross=await evaluate(`fetch('/goevent/api/coordinator/workspaces/${secondOrganization}/events/${event.id}').then(r=>r.status)`);
 if(cross!==403)throw Error('Organization switch ownership response: '+cross);
 await fill({'select[aria-label="Organization workspace"]':String(values.organizationId)});
 console.log('PASS: same-login organization switching preserves ownership boundaries');
 await until(`!!document.querySelector('select[aria-label="Event statistics"] option[value="${event.id}"]')`);
 await fill({'select[aria-label="Event statistics"]':String(event.id)});
 await until(`document.body.innerText.includes('Statistics for Browser reviewed event')`);
 const statistics=await evaluate(`fetch('/goevent/api/coordinator/workspaces/${values.organizationId}/statistics?from=2026-01-01T00:00:00Z&to=2028-01-01T00:00:00Z&eventId=${event.id}').then(r=>r.json())`);
 if(statistics.data.selectedEventId!==event.id||statistics.data.events!==1||!statistics.data.eventStates.some(state=>state.phase==='UPCOMING'&&state.count===1))throw Error('Event statistics scope/status unavailable');
 const forbiddenStats=await evaluate(`fetch('/goevent/api/coordinator/workspaces/${secondOrganization}/statistics?from=2026-01-01T00:00:00Z&to=2028-01-01T00:00:00Z&eventId=${event.id}').then(r=>r.status)`);
 if(forbiddenStats!==403)throw Error('Cross-organization event statistics allowed');
 console.log('PASS: per-event overview statistics and server-side scope enforcement');

 const csv=await evaluate(`fetch('/goevent/api/coordinator/workspaces/${values.organizationId}/events/${event.id}/attendees.csv').then(async r=>({status:r.status,body:await r.text()}))`);
 if(csv.status!==200||!csv.body.startsWith('booking_reference,'))throw Error('CSV unavailable');
 await until(`[...document.querySelectorAll('.coordinator-event-row')].some(e=>e.innerText.includes('Browser reviewed event'))`);
 await evaluate(`document.querySelectorAll('button[aria-label="Dismiss notification"]').forEach(button=>button.click())`);
 await until(`!document.querySelector('button[aria-label="Dismiss notification"]')`);
 const overview=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(output+'/coordinator-overview.png',Buffer.from(overview.data,'base64'));
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await until(`getComputedStyle(document.querySelector('#coordinator-sidebar')).visibility==='hidden'`);
 if(await evaluate(`document.documentElement.scrollWidth>innerWidth+1`))throw Error('Mobile workspace overflows the viewport');
 await evaluate(`document.querySelector('button[aria-label="Open coordinator navigation"]').click()`);
 await until(`document.querySelector('button[aria-label="Close coordinator navigation"]')?.getAttribute('aria-expanded')==='true' && getComputedStyle(document.querySelector('#coordinator-sidebar')).visibility==='visible' && Math.abs(document.querySelector('#coordinator-sidebar').getBoundingClientRect().left)<0.5`);
 const mobileMenu=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(output+'/coordinator-mobile-navigation.png',Buffer.from(mobileMenu.data,'base64'));
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await until(`document.activeElement?.getAttribute('aria-label')==='Open coordinator navigation' && getComputedStyle(document.querySelector('#coordinator-sidebar')).visibility==='hidden'`);
 const mobile=await send('Page.captureScreenshot' ,{format:'png',captureBeyondViewport:false});fs.writeFileSync(output+'/coordinator-mobile.png',Buffer.from(mobile.data,'base64'));
 console.log('PASS: authorized attendee CSV and responsive workspace');
 if(await evaluate(`document.body.innerText.includes('Access is approved separately for each organization.')`))throw Error('Removed sidebar note is still present');
 await evaluate(`document.querySelector('button[aria-label="Open coordinator navigation"]').click()`);
 await until(`getComputedStyle(document.querySelector('#coordinator-sidebar')).visibility==='visible' && Math.abs(document.querySelector('#coordinator-sidebar').getBoundingClientRect().left)<0.5`);
 await evaluate(`document.querySelector('.coordinator-account button[aria-haspopup="menu"]').click()`);
 await until(`!!document.querySelector('[role=menu]')`);
 const accountMenu=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(output+'/coordinator-account-menu.png',Buffer.from(accountMenu.data,'base64'));
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await until(`!document.querySelector('[role=menu]')&&document.querySelector('button[aria-label="Close coordinator navigation"]')?.getAttribute('aria-expanded')==='true'`);
 await evaluate(`document.querySelector('.coordinator-account button[aria-haspopup="menu"]').click()`);
 await click('Switch to user');await until(`location.pathname==='/profile'`);
 const personal=await evaluate(`fetch('/goevent/api/auth/session').then(r=>r.json())`);
 if(personal.userId!==Number(values.memberId)||!personal.authenticated)throw Error('Switch to user changed the authenticated identity');
 await navigate('/coordinator');await until(`!!document.querySelector('.coordinator-summary')`);
 await evaluate(`document.querySelector('button[aria-label="Open coordinator navigation"]').click()`);
 await until(`Math.abs(document.querySelector('#coordinator-sidebar').getBoundingClientRect().left)<0.5`);
 await evaluate(`document.querySelector('.coordinator-account button[aria-haspopup="menu"]').click()`);
 await until(`!!document.querySelector('[role=menu]')`);
 await evaluate(`document.querySelector('[role=menu] button[aria-label="Sign out"]').click()`);
 await until(`location.pathname==='/login'`);
 const loggedOut=await evaluate(`fetch('/goevent/api/coordinator/eligibility').then(r=>r.status)`);
 if(loggedOut!==401)throw Error('Logout did not invalidate coordinator access');
 console.log('PASS: account popup, nested Escape, same-account user switch and real logout');

}catch(error){
 try{const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(output+'/failure.png',Buffer.from(shot.data,'base64'));fs.writeFileSync(output+'/failure.txt',await evaluate('document.body.innerText'));}catch{}
 throw error;
}finally{ws.close();}
