// Local CDP browser acceptance test; invoked only by the disposable Python harness.
import fs from 'node:fs';
const [environmentPath,site,port,output]=process.argv.slice(2);
const environment=JSON.parse(fs.readFileSync(environmentPath,'utf8'));
const password=environment.values.find(v=>v.key==='password').value;
const targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let sequence=0;const pending=new Map();
ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const callback=pending.get(m.id);pending.delete(m.id);if(m.error)callback.reject(new Error(m.error.message));else callback.resolve(m.result);}});
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error('Browser script failed');return result.result.value;}
async function until(expression){const started=Date.now();while(Date.now()-started<60000){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,250));}throw new Error('Timed out waiting for browser condition: '+expression);}
async function click(label){await evaluate(`(()=>{const b=${label==='Sign In'?`document.querySelector('form button[type="submit"]')`:`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)})`};if(!b)throw Error('Missing button');b.click();})()`);}
try{
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:site+'/login'});
 await until(`!!document.querySelector('input[name="password"]')`);
 await until(`Object.keys(document.querySelector('form')).some(k=>k.startsWith('__reactProps') && typeof document.querySelector('form')[k].onSubmit==='function')`);
 // Native setter plus bubbling input event exercises the real React form.
 await evaluate(`(()=>{const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;for(const [selector,value] of ${JSON.stringify([['input[type=email]','admin@example.invalid'],['input[name=password]',password]])}){const input=document.querySelector(selector);set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));} })()`);
 await click('Sign In');
 await until(`location.pathname==='/admin' && !!document.querySelector('.admin-kpis')`);
 if(await evaluate(`document.body.innerText.includes('Design preview')`))throw Error('Live route incorrectly uses demo data');
 console.log('PASS: real browser shared login establishes admin session and renders live statistics');
 const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(output+'/live-dashboard.png',Buffer.from(screenshot.data,'base64'));
 await send('Page.navigate',{url:site+'/admin?view=accounts'});await until(`document.body.innerText.includes('admin@example.invalid')`);
 await click('Add account');await until(`!!document.querySelector('[role=dialog]')`);
 if(!await evaluate(`document.querySelector('[role=dialog]').innerText.includes('Initial password')`))throw Error('Account form missing');
 await evaluate(`document.querySelector('button[aria-label="Close dialog"]').click()`);
 await send('Page.navigate',{url:site+'/admin?view=events'});await until(`document.body.innerText.includes('Postman updated')`);
 console.log('PASS: live account list/create form and event list render from the backend');
 await evaluate(`document.querySelector('button[aria-haspopup=menu]').click()`);
 await click('Switch to user');
 await until(`location.pathname==='/profile' && [...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Back to admin')`);
 const mode=await evaluate(`fetch('/goevent/api/auth/session').then(r=>r.json())`);
 const expected=Number(environment.values.find(v=>v.key==='adminId').value);
 if(mode.userId!==expected||!mode.adminUserMode)throw Error('User mode changed identity or lost server marker');
 const denied=await evaluate(`fetch('/goevent/api/admin/accounts').then(r=>r.status)`);
 if(denied!==401)throw Error('Admin APIs remained accessible in user mode');
 await click('Back to admin');
 await until(`location.pathname==='/admin' && !!document.querySelector('.admin-kpis')`);
 console.log('PASS: same-account user mode denies admin APIs and securely returns to admin');
 await evaluate(`document.querySelector('button[aria-haspopup=menu]').click()`);
 await evaluate(`document.querySelector('button[aria-label="Sign out"]').click()`);
 await until(`location.pathname==='/login'`);
 await send('Page.navigate',{url:site+'/admin'});await until(`location.pathname==='/login'`);
 console.log('PASS: real browser logout invalidates access to admin routes');
}finally{ws.close();}
