'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowDownLeft, ArrowLeft, ArrowRight, CalendarDays, Check, LayoutDashboard, ListChecks, Mail, Menu, Plus, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react';
import { accountStates, adminApi, adminError, AdminRecord, AdminSection, AdminSession, reviewStates, roles, Statistics, statisticsRange } from '@/api/admin';
import { Dialog } from '@/components/ui/dialog';
import { AccountForm, EventForm, ReasonForm } from './forms';
import { Badge, Overview } from './overview';
import { AdminAccountMenu } from './account-menu';
import { useSessionStore } from '@/lib/session-store';
import { authApi } from '@/api';
import './admin.css';
const navigation=[{key:'statistics',name:'Overview',icon:LayoutDashboard},{key:'accounts',name:'Accounts',icon:Users},{key:'coordinator-requests',name:'Coordinator requests',icon:ListChecks},{key:'events',name:'Events',icon:CalendarDays},{key:'contacts',name:'Messages',icon:Mail},{key:'audit',name:'Audit trail',icon:ShieldCheck},{key:'emails',name:'Email delivery',icon:Activity}] as const;
const columns:Record<Exclude<AdminSection,'statistics'>,string[]>={accounts:['account','role_id','user_status_id','registered_date'], 'coordinator-requests':['email','organization_id','position','status_id','created_at'],events:['name','published_by','event_status_id','starts_at','disabled_at'],contacts:['email','subject','created_at','replied_at'],audit:['action','actor_id','target','reason','created_at'],emails:['status','attempts','available_at','provider_operation_id']};
const labels:Record<string,string>={account:'Account',role_id:'Role',user_status_id:'Access',registered_date:'Joined',organization_id:'Organization ID',status_id:'Status',created_at:'Created',published_by:'Publisher ID',event_status_id:'Review',starts_at:'Starts at',disabled_at:'Availability',replied_at:'Reply',actor_id:'Actor ID',target:'Target',available_at:'Next available',provider_operation_id:'Provider reference'};
const dateKey=(s:string)=>s.endsWith('_at')||s==='registered_date';
function display(value:unknown,key=''):string {
 if(value==null||value==='')return 'Unknown';
 if(dateKey(key)) {
  const raw=String(value),date=new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(raw)?raw:raw.replace(' ','T')+'Z');
  return Number.isFinite(+date)?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Colombo'}).format(date):'Unknown';
 }
 return String(value);
}
type Modal={kind:'account'|'event'|'detail';row?:AdminRecord}|{kind:'action';row?:undefined;title:string;path:string;method?:'POST'|'DELETE';body?:Record<string,unknown>;reply?:boolean;danger?:boolean};
export interface PreviewData {statistics:Statistics;records:Record<Exclude<AdminSection,'statistics'>,AdminRecord[]>}
export function AdminDashboard({preview}:{preview?:PreviewData}) {
 const router=useRouter(), searchParams=useSearchParams(), cache=useQueryClient();
 const selected=searchParams.get('view');
 const section:AdminSection=navigation.some(n=>n.key===selected)?selected as AdminSection:'statistics';
 const [mobile,setMobile]=useState(false),[page,setPage]=useState(0),[search,setSearch]=useState(''),[role,setRole]=useState(''),[status,setStatus]=useState(''),[phase,setPhase]=useState('ALL');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const [from,setFrom]=useState(today.slice(0,7)+'-01'),[to,setTo]=useState(today),[user,setUser]=useState('');
 const [modal,setModal]=useState<Modal|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[detailLoading,setDetailLoading]=useState(false);
 const gone=useRef(false),mutationLock=useRef(false);
 const session=useQuery({queryKey:['admin','session'],queryFn:adminApi.session,enabled:!preview&&!gone.current,retry:false,staleTime:0,refetchOnWindowFocus:true,refetchInterval:60000});
 const sessionActor:AdminSession|undefined=preview?{status:true,userId:1,role:'ADMIN',name:'Alex Morgan',email:'alex@example.invalid'}:session.data;
 // Older running backends may not expose session display fields yet. Read only
 // this signed-in account through the existing protected details endpoint.
 const identity=useQuery({queryKey:['admin','own-identity',sessionActor?.userId],queryFn:()=>adminApi.detail('accounts',sessionActor!.userId),enabled:!preview&&!!sessionActor&&!sessionActor.name&&!session.error&&!gone.current,retry:false});
 const actor=sessionActor?{...sessionActor,name:sessionActor.name||[identity.data?.fname,identity.data?.lname].filter(Boolean).join(' ').trim(),email:sessionActor.email||(typeof identity.data?.email==='string'?identity.data.email:undefined)}:undefined;
 const authorized=!!actor&&!gone.current&&!session.error;
 useEffect(()=>{setPage(0);setSearch('');setStatus('');setRole('');setPhase('ALL');setModal(null);setError('');setNotice('');},[section]);
 function expired(){gone.current=true;setModal(null);useSessionStore.getState().clear();void cache.cancelQueries();cache.clear();router.replace('/login');}
 useEffect(()=>{if((session.error as {status?:number})?.status===401||(session.error as {status?:number})?.status===403){gone.current=true;cache.clear();router.replace('/login');}},[session.error,cache,router]);
 let range:Record<string,string>={},rangeError='';
 try{range=statisticsRange(from,to);if(user&&(!/^\d+$/.test(user)||Number(user)<=0))rangeError='Select a positive account ID.';}catch(e){rangeError=adminError(e);}
 const params:Record<string,string|number>={page,size:25,...(section==='accounts'?{search,...(role?{role}: {})}:{}),...(status?{status}:{}),...(section==='events'?{phase}:{})};
 const stats=useQuery({queryKey:['admin','statistics',range,user],queryFn:()=>adminApi.statistics({...range,...(user?{userId:user}:{})}),enabled:authorized&&!preview&&section==='statistics'&&!rangeError,retry:false});
 const list=useQuery({queryKey:['admin','list',section,params],queryFn:()=>adminApi.list(section as Exclude<AdminSection,'statistics'>,params),enabled:authorized&&!preview&&section!=='statistics',retry:false,placeholderData:undefined});
 const apiError=section==='statistics'?stats.error:list.error;
 useEffect(()=>{if((apiError as {status?:number})?.status===401){gone.current=true;cache.clear();router.replace('/login');}},[apiError,cache,router]);
 const users=useQuery({queryKey:['admin','account-lookup',search],queryFn:()=>adminApi.list('accounts',{search,size:100,page:0}),enabled:authorized&&!preview&&section==='statistics',retry:false});
 const records=section==='statistics'?[]:preview?preview.records[section]:list.data||[];
 const rows=preview?records.filter(r=>(!search||Object.values(r).some(v=>String(v).toLowerCase().includes(search.toLowerCase())))&&(!status||Number(r.user_status_id??r.event_status_id??r.status_id)===Number(status))&&(!role||Number(r.role_id)===Number(role))):records;
 const report=preview?preview.statistics:stats.data;
 async function save(method:'POST'|'PUT'|'DELETE',path:string,body:unknown) {
  if(preview){setError('Design preview is read-only. Sign in to test live changes.');return;}
  if(mutationLock.current)return;mutationLock.current=true;setBusy(true);setError('');setNotice('');
  try {await adminApi.write(method,path,body);setModal(null);setNotice(path.includes('/reply')?'Reply queued. Provider acceptance is not inbox delivery.':'Change saved. Audit and notification records updated.');await cache.invalidateQueries({queryKey:['admin']});}
  catch(e){setError(adminError(e));if((e as {status?:number}).status===401)expired();else if((e as {status?:number}).status===409){await cache.invalidateQueries({queryKey:['admin']});setModal(null);}}
  finally{mutationLock.current=false;setBusy(false);}
 }
 async function open(kind:'detail'|'account'|'event',row:AdminRecord){setError('');setDetailLoading(true);try{const fresh=preview?row:await adminApi.detail(section,Number(row.id));setModal({kind,row:fresh});}catch(e){setError(adminError(e));if((e as {status?:number}).status===401)expired();}finally{setDetailLoading(false);}}
 async function decideEvent(row:AdminRecord,approve:boolean){setDetailLoading(true);try{const fresh=preview?row:await adminApi.detail('events',Number(row.id));setModal({kind:'action',title:approve?'Approve event':'Reject event',path:`events/${row.id}/decision`,body:{approve,revision:fresh.revision}});}catch(e){setError(adminError(e));}finally{setDetailLoading(false);}}
 async function switchToUser(){
  if(preview||mutationLock.current)return;
  mutationLock.current=true;setBusy(true);setError('');
  try {
   await adminApi.write('POST','auth/switch-to-user',{});
   gone.current=true;
   await cache.cancelQueries();cache.clear();
   const current=await authApi.getSession();
   if(!current.authenticated)throw new Error('User session could not be verified. Please sign in again.');
   useSessionStore.getState().setAuthenticated({userId:current.userId,name:current.name,email:current.email,roleId:current.roleId,adminUserMode:current.adminUserMode});
   router.replace('/profile');
  }catch(e){setError(adminError(e));if(gone.current||(e as {status?:number}).status===401)expired();}
  finally{mutationLock.current=false;setBusy(false);}
 }
 async function logout(){if(preview){router.push('/login');return;}if(mutationLock.current)return;mutationLock.current=true;setBusy(true);try{await adminApi.write('POST','auth/logout',{});expired();}catch(e){setError(adminError(e));if((e as {status?:number}).status===401)expired();}finally{mutationLock.current=false;setBusy(false);}}
 const action=(title:string,path:string,body?:Record<string,unknown>,danger=false,method:'POST'|'DELETE'='POST')=>setModal({kind:'action',title,path,body,danger,method});
 const title=navigation.find(n=>n.key===section)?.name||'Overview';
 if(!authorized&&!preview)return <div className="admin-app grid min-h-screen place-items-center p-8"><section className="admin-card max-w-md"><ShieldCheck className="mb-5"/><h1 className="text-xl font-semibold">{session.error?'Cannot verify your session':'Verifying administrator access'}</h1><p role="status" className="admin-sub mt-3">{session.error?adminError(session.error):'Checking your current account permissions…'}</p>{session.error&&<div className="admin-tools mt-6"><button className="admin-btn" onClick={()=>session.refetch()}>Retry</button><Link className="admin-btn primary" href="/login">Sign in</Link></div>}</section></div>;
 function cell(row:AdminRecord,key:string){
  if(key==='account')return <><span className="admin-row-title">{row.fname} {row.lname}</span><span className="admin-sub">{row.email}</span></>;
  if(key==='target')return `${row.target_type} #${row.target_id}`;
  if(key==='role_id')return roles[Number(row[key])]||'Unknown';
  if(key==='user_status_id')return <Badge tone={Number(row[key])===1?'green':Number(row[key])===2?'red':'amber'}>{accountStates[Number(row[key])]}</Badge>;
  if(key==='status_id'||key==='event_status_id')return <Badge tone={Number(row[key])===2?'green':Number(row[key])===3?'red':'amber'}>{reviewStates[Number(row[key])]}</Badge>;
  if(key==='status')return <Badge tone={row.status==='FAILED'?'red':row.status==='ACCEPTED'?'green':'amber'}>{row.status}</Badge>;
  if(key==='disabled_at')return <Badge tone={row.disabled_at?'red':'green'}>{row.disabled_at?'Disabled':'Enabled'}</Badge>;
  if(key==='replied_at')return <Badge tone={row.replied_at?'green':'amber'}>{row.replied_at?'Replied':'Awaiting reply'}</Badge>;
  return display(row[key],key);
 }
 return <div className="admin-app">
 {mobile&&<button aria-label="Close navigation" onClick={()=>setMobile(false)} className="fixed inset-0 z-20 bg-black/30 md:hidden"/>}
 <aside className={`admin-sidebar ${mobile?'open':''}`}><Link href={preview?'/admin/preview':'/admin'} className="admin-brand"><span className="admin-brand-slashes" aria-hidden="true"><i/><i/><i/></span><span><span className="admin-wordmark">GOEVENT</span><span className="admin-brand-caption">Administration</span></span></Link><div className="admin-nav"><p className="admin-eyebrow mb-3 px-3">Workspace</p>{navigation.slice(0,5).map(n=><Link key={n.key} aria-current={section===n.key?'page':undefined} href={`${preview?'/admin/preview':'/admin'}?view=${n.key}`} onClick={()=>setMobile(false)}><n.icon size={16}/>{n.name}</Link>)}<div className="my-5 border-t border-white/10"/><p className="admin-eyebrow mb-3 px-3">Platform activity</p>{navigation.slice(5).map(n=><Link key={n.key} aria-current={section===n.key?'page':undefined} href={`${preview?'/admin/preview':'/admin'}?view=${n.key}`} onClick={()=>setMobile(false)}><n.icon size={16}/>{n.name}</Link>)}</div><div className="admin-sidebar-bottom"><AdminAccountMenu actor={actor!} busy={busy} preview={!!preview} onSwitch={switchToUser} onLogout={logout}/></div></aside>
 <main className="admin-main"><header className="admin-top"><div className="flex items-center gap-3"><button className="admin-btn admin-mobile-toggle" aria-label="Open navigation" aria-expanded={mobile} onClick={()=>setMobile(!mobile)}><Menu size={16}/></button><div><p className="admin-eyebrow">GoEvent / Administration</p><h1>{title}<span className="admin-title-dot" aria-hidden="true"/></h1></div></div><div className="admin-tools"><button className="admin-btn" disabled={busy} onClick={()=>{setError('');void cache.invalidateQueries({queryKey:['admin']});}}><RefreshCw size={14}/><span className="hidden sm:inline">Refresh</span></button>{section==='accounts'&&<button className="admin-btn primary" onClick={()=>{setError('');setModal({kind:'account'});}}><Plus size={15}/>Add account</button>}{section==='statistics'&&<Link className="admin-btn primary" href={`${preview?'/admin/preview':'/admin'}?view=coordinator-requests`}><ListChecks size={15}/>Review requests</Link>}</div></header>
 {preview&&<div className="admin-preview-banner">Design preview · Fictional sample data · Live API requests and writes are disabled. <Link className="underline" href="/login">Sign in for live testing</Link></div>}
 <div className="admin-filters">{section==='statistics'?<><label>From date<input className="admin-input" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Through date<input className="admin-input" type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><label>Account scope<select className="admin-input" value={user} onChange={e=>setUser(e.target.value)}><option value="">All accounts</option>{(preview?preview.records.accounts:users.data||[]).map(r=><option key={r.id} value={String(r.id)}>{r.fname} {r.lname} · #{r.id}</option>)}</select></label><label>Or enter account ID<input className="admin-input" inputMode="numeric" placeholder="Any account ID" value={user} onChange={e=>setUser(e.target.value)}/></label><span className="admin-sub mb-2">Dates in Asia/Colombo</span></>:<>{section==='accounts'&&<><label>Find an account<div className="relative"><Search size={13} className="absolute left-3 top-3"/><input className="admin-input !pl-8" placeholder="Name or email…" maxLength={100} value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></div></label><label>Role<select className="admin-input" value={role} onChange={e=>{setRole(e.target.value);setPage(0);}}><option value="">All roles</option>{Object.entries(roles).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label></>}{['accounts','events','coordinator-requests'].includes(section)&&<label>{section==='accounts'?'Access':'Review status'}<select className="admin-input" value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}><option value="">All statuses</option>{Object.entries(section==='accounts'?accountStates:reviewStates).filter(([id])=>section==='events'||id!=='4').map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>}{section==='events'&&<label>Schedule<select className="admin-input" value={phase} onChange={e=>{setPhase(e.target.value);setPage(0);}}>{['ALL','UPCOMING','ONGOING','COMPLETED','UNKNOWN'].map(p=><option key={p}>{p}</option>)}</select></label>}<p className="admin-sub mb-2">{section==='emails'?'Acceptance is not inbox delivery.':section==='audit'?'Read-only administrative history.':'Latest records · 25 per page'}</p></>}</div>
 {(error||apiError||rangeError&&section==='statistics')&&<div role="alert" className="admin-alert">{error||(apiError?adminError(apiError):rangeError)} <button className="underline" onClick={()=>{setError('');void cache.invalidateQueries({queryKey:['admin']});}}>Refresh data</button></div>}
 {notice&&<p role="status" className="admin-notice"><Check size={15}/>{notice}</p>}
 {detailLoading&&<p role="status" className="admin-sub mb-3">Fetching current record…</p>}
 {!preview&&!rangeError&&(section==='statistics'?stats.isPending:list.isPending)?<div role="status" className="admin-card admin-empty">Loading {title.toLowerCase()}…</div>:section==='statistics'?(report&&!rangeError&&<Overview data={report}/>):<><div className="admin-table-wrap"><table className="admin-table"><thead><tr>{columns[section].map(key=><th key={key}>{labels[key]||key.replaceAll('_',' ')}</th>)}<th>Actions</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}>{columns[section].map(key=><td key={key}>{cell(row,key)}</td>)}<td><div className="flex gap-2"><button className="admin-btn" disabled={busy||detailLoading} onClick={()=>['accounts','events','contacts'].includes(section)?void open('detail',row):setModal({kind:'detail',row})}>View</button>{section==='accounts'&&<><button className="admin-btn" disabled={busy||detailLoading} onClick={()=>open('account',row)}>Edit</button><button className="admin-btn" disabled={busy||row.id===actor?.userId} onClick={()=>action(row.user_status_id===2?'Reactivate account':'Disable account',`accounts/${row.id}/${row.user_status_id===2?'enable':'disable'}`)}>{row.user_status_id===2?'Reactivate':'Disable'}</button>{row.role_id===2&&<button className="admin-btn" disabled={busy} onClick={()=>action('Revoke coordinator',`accounts/${row.id}/revoke-coordinator`)}>Revoke</button>}<button className="admin-btn danger" disabled={busy||row.id===actor?.userId} onClick={()=>action('Delete account',`accounts/${row.id}`,{},true,'DELETE')}>Delete</button></>}{section==='coordinator-requests'&&row.status_id===1&&<><button className="admin-btn" disabled={busy} onClick={()=>action('Approve coordinator',`coordinator-requests/${row.id}/decision`,{approve:true})}>Approve</button><button className="admin-btn danger" disabled={busy} onClick={()=>action('Reject coordinator',`coordinator-requests/${row.id}/decision`,{approve:false})}>Reject</button></>}{section==='events'&&<><button className="admin-btn" disabled={busy||!!row.disabled_at||detailLoading} onClick={()=>open('event',row)}>Edit</button>{row.event_status_id===1&&!row.disabled_at&&<><button className="admin-btn" disabled={busy||detailLoading} onClick={()=>decideEvent(row,true)}>Approve</button><button className="admin-btn danger" disabled={busy||detailLoading} onClick={()=>decideEvent(row,false)}>Reject</button></>}{!row.disabled_at&&<button className="admin-btn" disabled={busy} onClick={()=>action('Disable event',`events/${row.id}/disable`)}>Disable</button>}<button className="admin-btn danger" disabled={busy} onClick={()=>action('Delete event',`events/${row.id}`,{},true,'DELETE')}>Delete</button></>}{section==='contacts'&&!row.replied_at&&<button className="admin-btn" disabled={busy} onClick={()=>setModal({kind:'action',title:'Send reply',path:`contacts/${row.id}/reply`,reply:true})}>Reply</button>}{section==='emails'&&row.status==='FAILED'&&<button className="admin-btn" disabled={busy} onClick={()=>action('Retry notification',`emails/${row.id}/retry`)}>Retry</button>}</div></td></tr>)}</tbody></table>{!rows.length&&<div className="admin-empty"><ArrowDownLeft size={23} className="mx-auto mb-4 text-gray-300"/><p className="font-medium text-gray-600">Nothing here yet</p><p className="mt-2 text-xs">No records match the current filters.</p></div>}</div><div className="admin-pagination"><span>Page {page+1} · {rows.length} records shown</span><div className="admin-tools"><button className="admin-btn" disabled={page===0||busy} onClick={()=>setPage(p=>p-1)}><ArrowLeft size={13}/>Previous</button><button className="admin-btn" disabled={rows.length<25||busy||page>=100000||!!preview} onClick={()=>setPage(p=>p+1)}>Next<ArrowRight size={13}/></button></div></div></>}
 <footer className="mt-8 flex justify-between border-t border-gray-200 pt-4 text-[10px] text-gray-400"><span>GOEVENT · ADMINISTRATION</span><span>Server-enforced permissions · Audited actions</span></footer>
 </main>
 <Dialog open={!!modal} onClose={()=>{if(!busy){setModal(null);setError('');}}} title={modal?.kind==='action'?modal.title:modal?.kind==='account'?modal.row?'Edit account':'Create account':modal?.kind==='event'?'Edit event':'Record details'} description={modal?.row?`Record #${modal.row.id}`:modal?.kind==='action'?`Target: ${modal.path}`:undefined}>
 {error&&<p role="alert" className="admin-alert">{error}</p>}{preview&&<p className="admin-notice">Read-only design preview. Forms can be explored; submissions are disabled.</p>}
 {modal?.kind==='account'&&<AccountForm preview={!!preview} record={modal.row} busy={busy||!!preview} onCancel={()=>setModal(null)} onSave={input=>save(modal.row?'PUT':'POST',modal.row?`accounts/${modal.row.id}`:'accounts',input)}/>}
 {modal?.kind==='event'&&modal.row&&<EventForm record={modal.row} busy={busy||!!preview} onCancel={()=>setModal(null)} onSave={input=>save('PUT',`events/${modal.row?.id}`,input)}/>}
 {modal?.kind==='action'&&<ReasonForm title={modal.title} reply={modal.reply} danger={modal.danger} busy={busy||!!preview} onCancel={()=>setModal(null)} onSave={value=>save(modal.method||'POST',modal.path,modal.reply?{message:value}:{...modal.body,reason:value})}/>}
 {modal?.kind==='detail'&&<dl className="admin-detail">{Object.entries(modal.row||{}).map(([key,value])=><div key={key}><dt>{labels[key]||key.replaceAll('_',' ')}</dt><dd>{display(value,key)}</dd></div>)}</dl>}
 </Dialog></div>;
}
