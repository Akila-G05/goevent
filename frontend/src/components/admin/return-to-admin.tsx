'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { adminApi, adminError } from '@/api/admin';
import { useSessionStore } from '@/lib/session-store';
export function ReturnToAdmin({onSwitching}:{onSwitching:(value:boolean)=>void}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const router=useRouter(),cache=useQueryClient();
 return <span><button type="button" disabled={busy} className="px-3.5 py-1 rounded-full bg-[#1c1b1b] text-white text-xs font-semibold uppercase shrink-0" onClick={async()=>{
  if(busy)return;setBusy(true);setError('');onSwitching(true);
  try{
   const result=await adminApi.write('POST','auth/switch-to-admin',{});
   const current=await adminApi.session();
   if(!current.status||current.role!=='ADMIN')throw new Error('Admin session could not be verified.');
   await cache.cancelQueries();cache.clear();
   useSessionStore.getState().setAuthenticated({userId:result.userId,roleId:'ADMIN',adminUserMode:false});
   router.replace('/admin');
  }catch(e){setError(adminError(e));onSwitching(false);}finally{setBusy(false);}
 }}>{busy?'Switching…':'Back to admin'}</button>{error&&<span role="alert" className="block text-xs text-red-700 mt-2">{error}</span>}</span>;
}
