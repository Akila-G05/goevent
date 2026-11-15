'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronUp, LogOut, Users } from 'lucide-react';
import type { AdminSession } from '@/api/admin';

export function AdminAccountMenu({actor,busy,preview,onSwitch,onLogout}:{actor:AdminSession;busy:boolean;preview:boolean;onSwitch:()=>void;onLogout:()=>void}) {
 const [open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const id=useId();
 const name=actor.name?.trim()||actor.email||'Your account';
 const initials=name.includes('@')?name.slice(0,1).toUpperCase():name.split(/\s+/).slice(0,2).map(n=>Array.from(n)[0]).join('').toUpperCase();
 useEffect(()=>{
  if(!open)return;
  root.current?.querySelector<HTMLButtonElement>('[role=menuitem]:not(:disabled)')?.focus();
  const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();setOpen(false);trigger.current?.focus();}
   if(event.key==='ArrowDown'||event.key==='ArrowUp'||event.key==='Home'||event.key==='End'){
    const items=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]:not(:disabled)')||[]);
    if(!items.length)return;event.preventDefault();
    const current=items.indexOf(document.activeElement as HTMLButtonElement);
    const next=event.key==='Home'?0:event.key==='End'?items.length-1:(current+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
    items[next].focus();
   }
  };
  document.addEventListener('pointerdown',close);root.current?.addEventListener('keydown',key);
  const element=root.current;
  return()=>{document.removeEventListener('pointerdown',close);element?.removeEventListener('keydown',key);};
 },[open]);
 return <div className="admin-account-menu" ref={root} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setOpen(false);}}>
  {open&&<div id={id} className="admin-account-popup" role="menu" aria-label="Account actions">
   <div className="admin-account-popup-heading"><strong title={name}>{name}</strong>{actor.email&&<span title={actor.email}>{actor.email}</span>}</div>
   <button role="menuitem" tabIndex={-1} disabled={busy||preview} onClick={()=>{setOpen(false);onSwitch();}}><Users size={15}/>Switch to user</button>
   <button role="menuitem" tabIndex={-1} aria-label="Sign out" disabled={busy} onClick={()=>{setOpen(false);onLogout();}}><LogOut size={15}/>Log out</button>
  </div>}
  <button ref={trigger} type="button" className="admin-account-trigger" aria-label={`Account: ${name}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open?id:undefined} disabled={busy} onClick={()=>setOpen(!open)} onKeyDown={e=>{if(!open&&(e.key==='ArrowDown'||e.key==='ArrowUp')){e.preventDefault();setOpen(true);}}}>
   <span className="admin-avatar" aria-hidden="true">{initials}</span><span className="admin-account-identity"><strong title={name}>{name}</strong><span className="admin-sub">Administrator</span></span><ChevronUp size={15} className={open?'admin-account-chevron open':'admin-account-chevron'}/>
  </button>
 </div>;
}
