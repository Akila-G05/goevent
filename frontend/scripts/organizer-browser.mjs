// Called only by organizer-smoke.py with disposable services and fixture credentials.
import fs from 'node:fs';
const [fixture,site,port]=process.argv.slice(2);
const {password}=JSON.parse(fs.readFileSync(fixture,'utf8'));
const targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let next=0;const pending=new Map();
ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const callback=pending.get(m.id);pending.delete(m.id);if(m.error)callback.reject(Error(m.error.message));else callback.resolve(m.result);}});
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||'Browser expression failed');return r.result.value;}
async function until(expression){const end=Date.now()+60000;while(Date.now()<end){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,250));}throw Error('Browser condition timed out: '+expression+'; page: '+await evaluate('document.body.innerText.slice(0,3000)'));}
async function fill(values){await evaluate(`(()=>{for(const [selector,value] of ${JSON.stringify(Object.entries(values))}){const field=document.querySelector(selector);if(!field)throw Error('Missing '+selector);const prototype=field instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));}})()`);}
async function navigate(path){await send('Page.navigate',{url:site+path});}
async function login(email){await navigate('/login?returnTo=%2Fcoordinator');await until(`!!document.querySelector('input[name=password]') && Object.keys(document.querySelector('form')).some(k=>k.startsWith('__reactProps'))`);await fill({'input[type=email]':email,'input[name=password]':password});await evaluate(`document.querySelector('form button[type=submit]').click()`);await until(`location.pathname==='/profile'`);}
try{
 await login('organizer-smoke@example.invalid');
 await until(`!![...document.querySelectorAll('button')].find(b=>/create event/i.test(b.textContent))`);
 await evaluate(`[...document.querySelectorAll('button')].find(b=>/create event/i.test(b.textContent)).click()`);
 await until(`!!document.querySelector('#create-event-form')`);
 await fill({'input[name=name]':'Smoke organizer listing','select[name=categoryName]':'Technology','select[name=audienceName]':'Public','input[name=venueName]':'Smoke Hall','input[name=venueCity]':'Colombo','input[type=date]':'2030-06-15'});
 await evaluate(`(()=>{const fields=document.querySelectorAll('#create-event-form input[type=time]');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;for(const [i,value] of ['10:00','12:00'].entries()){set.call(fields[i],value);fields[i].dispatchEvent(new Event('input',{bubbles:true}));fields[i].dispatchEvent(new Event('change',{bubbles:true}));}})()`);
 await evaluate(`document.querySelector('button[form="create-event-form"]').click()`);
 await until(`!document.querySelector('#create-event-form') && document.body.innerText.toLowerCase().includes('smoke organizer listing')`);
 await until(`document.body.innerText.toLowerCase().includes('published')`);
 const id=await evaluate(`(async()=>{for(let attempt=0;attempt<5;attempt++){const r=await fetch('/goevent/api/events/mine');if(r.status===429){await new Promise(resolve=>setTimeout(resolve,1000));continue;}if(!r.ok)throw Error('Owned list denied');const data=await r.json();return data.events.find(e=>e.name==='Smoke organizer listing').id;}throw Error('Rate limit did not recover');})()`);
 await navigate('/events/'+id);await until(`document.body.innerText.toLowerCase().includes('smoke organizer listing')`);
 const retired=await evaluate(`fetch('/admin').then(r=>r.status)`);
 if(retired!==404)throw Error('Admin dashboard is still public');
 await login('user-smoke@example.invalid');await until(`document.body.innerText.toLowerCase().includes('saved events')`);
 if(await evaluate(`!![...document.querySelectorAll('button')].find(b=>/create event/i.test(b.textContent))`))throw Error('Attendee sees organizer controls');
 console.log('PASS: browser login, organizer creation, immediate published detail, retired admin route and attendee controls');
}finally{ws.close();}
