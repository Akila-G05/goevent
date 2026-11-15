import { Activity, CalendarDays, CircleHelp, ChevronDown, CreditCard, Layers3, Ticket, Users } from 'lucide-react';
import { accountStates, AdminRecord, paymentStates, reviewStates, roles, Statistics } from '@/api/admin';
const palette=['#1c1b1b','#77716d','#b1aaa5','#ded8d3','#c65a50','#ded0c8'];
const count=(rows:AdminRecord[],key='count')=>rows.reduce((s,r)=>s+Number(r[key]||0),0);
export function Badge({children,tone=''}:{children:React.ReactNode;tone?:string}) {return <span className={`admin-badge ${tone}`}>{children}</span>;}
function Bars({rows}:{rows:{label:string;value:number}[]}) {
 const max=Math.max(1,...rows.map(r=>r.value));
 return <div className="admin-bars" role="img" aria-label={rows.map(r=>`${r.label}: ${r.value}`).join(', ')}>{rows.map((r,i)=><div className="admin-bar-col" key={r.label}><span className="admin-bar-value">{r.value.toLocaleString()}</span><div className="admin-bar" style={{height:`${r.value/max*145}px`,background:palette[i%palette.length]}}/><span className="admin-bar-label">{r.label}</span></div>)}</div>;
}
function Donut({rows}:{rows:{label:string;value:number}[]}) {
 const total=rows.reduce((s,r)=>s+r.value,0);let offset=0;
 const gradient=rows.map((r,i)=>{const start=offset;offset+=total?r.value/total*100:0;return `${palette[i%palette.length]} ${start}% ${offset}%`;}).join(',');
 return <div className="admin-donut-wrap"><div className="admin-donut" aria-hidden="true" style={{background:total?`conic-gradient(${gradient})`:'#eceef1'}}><div className="admin-donut-center">{total}<small>total events</small></div></div><ul className="admin-legend">{rows.map((r,i)=><li key={r.label}><span className="admin-dot" style={{background:palette[i%palette.length]}}/>{r.label} <strong className="ml-3">{r.value}</strong></li>)}</ul></div>;
}
export function Overview({data}:{data:Statistics}) {
 const roleRows=Object.entries(roles).map(([id,label])=>({label,value:count(data.currentAccounts.filter(r=>Number(r.role_id)===Number(id)))}));
 const eventRows=Object.entries(reviewStates).map(([id,label])=>({label,value:count(data.currentEventStates.filter(r=>Number(r.event_status_id)===Number(id)))}));
 return <>
 <div className="admin-kpis">{[{label:'Platform accounts',value:count(data.currentAccounts),hint:'Current account snapshot',icon:Users},{label:'Events created',value:data.eventsCreated,hint:'Within selected date range',icon:CalendarDays},{label:'Bookings recorded',value:data.bookings,hint:'Not confirmed paid sales',icon:Ticket},{label:'Coordinator applications',value:data.requestsSubmitted,hint:'Submitted in selected range',icon:Activity}].map(k=><article className="admin-kpi" key={k.label}><div className="flex items-center justify-between"><span className="admin-sub">{k.label}</span><k.icon size={15} className="text-gray-400"/></div><strong>{k.value.toLocaleString()}</strong><span className="admin-sub">{k.hint}</span></article>)}</div>
 <div className="admin-grid">
 <section className="admin-card"><div className="admin-card-heading"><h2><span className="admin-chip"><Users size={15}/></span>Community composition</h2><Badge>Current snapshot</Badge></div><p className="admin-sub">Every account, grouped by its current role</p><Bars rows={roleRows}/></section>
 <section className="admin-card"><div className="admin-card-heading"><h2><span className="admin-chip"><Layers3 size={15}/></span>Event review status</h2><Badge>Current snapshot</Badge></div><p className="admin-sub">Approval state is separate from the event schedule</p><Donut rows={eventRows}/></section>
 </div>
 <section className="admin-reports" aria-label="Detailed reports">
  <div className="admin-reports-heading"><h2>Detailed reports</h2><span className="admin-sub">Open a report when you need more detail</span></div>
  <details className="admin-report">
   <summary><CalendarDays size={16}/><span>Event schedule<small>Upcoming, ongoing and completed events</small></span><ChevronDown size={15} className="admin-report-chevron"/></summary>
   <div className="admin-report-content">
    <p className="admin-sub">Current snapshot · Asia/Colombo · Disabled and unknown schedules included</p>
    <Bars rows={data.currentEventSchedule.map(r=>({label:String(r.phase).toLowerCase(),value:Number(r.count)}))}/>
    {!data.currentEventSchedule.length&&<p className="admin-sub mt-3">No scheduled events to display.</p>}
    <p className="admin-sub mt-5">Events without a recorded creation time: {data.eventsWithoutCreationTime}</p>
   </div>
  </details>
  <details className="admin-report">
   <summary><CreditCard size={16}/><span>Payments &amp; tickets<small>Currency breakdowns, bookings and issued tickets</small></span><ChevronDown size={15} className="admin-report-chevron"/></summary>
   <div className="admin-report-content">
    <p className="admin-sub mb-4">Date-filtered records · Amounts remain separated by currency and current payment status</p>
    <div className="admin-notice"><CircleHelp size={16} className="mt-1 shrink-0"/><p>{data.financialNotice}</p></div>
    <div className="overflow-auto"><table className="admin-table"><thead><tr><th>Currency / outcome</th><th>Amount</th><th>Records</th></tr></thead><tbody>{data.paymentAmounts.map((r,i)=><tr key={i}><td>{String(r.currency)}<small className="block text-gray-500">{paymentStates[Number(r.p_status_id)]||'Unknown'}</small></td><td>{r.amount==null?'Unknown':String(r.amount)}</td><td>{String(r.records)}{Number(r.invalid_amounts)>0&&<span className="block text-red-700">{String(r.invalid_amounts)} invalid amounts</span>}</td></tr>)}</tbody></table>{!data.paymentAmounts.length&&<p className="admin-empty">No payment records in this range.</p>}</div>
    <div className="admin-report-groups">{[
     {title:'Booking amounts (currency unknown)',rows:data.bookingAmounts.map(r=>`${r.currency}: ${r.amount??'No amount'}`)},
     {title:'Booked ticket quantities',rows:data.ticketQuantities.map(r=>`${r.booked_quantity??0} booked · ${r.invalid_quantities??0} invalid quantities`)},
     {title:'Issued tickets by status ID',rows:data.issuedTickets.map(r=>`Status ${r.ticket_status_id}: ${r.count}`)},
     {title:'Payment outcomes',rows:data.paymentOutcomes.map(r=>`${r.currency} · ${paymentStates[Number(r.p_status_id)]}: ${r.count}`)}
    ].map(g=><ReportList key={g.title} title={g.title} rows={g.rows}/>)}</div>
   </div>
  </details>
  <details className="admin-report">
   <summary><Users size={16}/><span>Community &amp; requests<small>Registrations, account access and coordinator decisions</small></span><ChevronDown size={15} className="admin-report-chevron"/></summary>
   <div className="admin-report-content">
    <div className="admin-report-groups">{[
     {title:'New registrations in range',rows:[String(data.registrations)]},
     {title:'Account access (current)',rows:data.currentAccounts.map(r=>`${roles[Number(r.role_id)]} · ${accountStates[Number(r.user_status_id)]}: ${r.count}`)},
     {title:'Coordinator requests (current)',rows:data.currentCoordinatorRequests.map(r=>`${reviewStates[Number(r.status_id)]}: ${r.count}`)},
     {title:'Coordinator decisions in range',rows:data.coordinatorDecisions.map(r=>`${reviewStates[Number(r.status_id)]}: ${r.count}`)}
    ].map(g=><ReportList key={g.title} title={g.title} rows={g.rows}/>)}</div>
    <p className="admin-sub mt-5">Requests without a recorded submission time: {data.requestsWithoutSubmissionTime}</p>
   </div>
  </details>
 </section>
 </>;
}
function ReportList({title,rows}:{title:string;rows:string[]}) {
 return <div><h3 className="text-xs font-semibold mb-2">{title}</h3>{rows.length?<ul className="space-y-1">{rows.map((row,i)=><li key={i} className="admin-sub">{row}</li>)}</ul>:<p className="admin-sub">No records</p>}</div>;
}
