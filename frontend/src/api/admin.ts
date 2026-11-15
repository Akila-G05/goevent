import { apiClient } from '@/lib/api-client';
import { API_PREFIX } from './routes';

export type AdminSection = 'statistics' | 'accounts' | 'coordinator-requests' | 'events' | 'contacts' | 'audit' | 'emails';
export type AdminRecord = Record<string, string | number | null>;
export interface AdminSession { status: boolean; userId: number; role: 'ADMIN'; name?: string; email?: string }
export interface Csrf { headerName: string; token: string }
export interface AccountInput { firstName: string; lastName: string; email: string; password?: string; roleId: number; statusId: number; reason: string; organizationId?: number; position?: string }
export interface EventInput { name: string; description: string | null; startsAt: string; endsAt: string; revision: number; reason: string }
export interface Statistics {
 fromInclusive: string; toExclusive: string; eventTimeZone: string;
 currentAccounts: AdminRecord[]; registrations: number; currentEventStates: AdminRecord[];
 eventsCreated: number; eventsWithoutCreationTime: number; requestsSubmitted: number;
 currentCoordinatorRequests: AdminRecord[]; coordinatorDecisions: AdminRecord[];
 currentEventSchedule: AdminRecord[]; requestsWithoutSubmissionTime: number;
 bookings: number; bookingAmounts: AdminRecord[]; paymentOutcomes: AdminRecord[];
 paymentAmounts: AdminRecord[]; ticketQuantities: AdminRecord[]; issuedTickets: AdminRecord[]; financialNotice: string;
}
const base = `${API_PREFIX}/admin`;
export const adminApi = {
 csrf: async () => (await apiClient.get<Csrf>(`${base}/auth/csrf`)).data,
 session: async () => (await apiClient.get<AdminSession>(`${base}/auth/session`)).data,
 async login(email: string, password: string) {
  const csrf = await this.csrf();
  await apiClient.post(`${base}/auth/login`, {email,password}, {headers:{[csrf.headerName]:csrf.token}});
  await this.csrf();
  const session = await this.session();
  if (!session.status || session.role !== 'ADMIN') throw new Error('Administrator session could not be verified.');
  return session;
 },
 list: async (section: Exclude<AdminSection,'statistics'>, params: Record<string,string|number>) =>
  (await apiClient.get<{status:boolean;data:AdminRecord[]}>(`${base}/${section}`, {params})).data.data,
 statistics: async (params: Record<string,string|number>) => (await apiClient.get<{status:boolean;data:Statistics}>(`${base}/statistics`, {params})).data.data,
 detail: async (section:string, id:number) => (await apiClient.get<{status:boolean;data:AdminRecord}>(`${base}/${section}/${id}`)).data.data,
 async write(method:'POST'|'PUT'|'DELETE', path:string, body:unknown) {
  const csrf=await this.csrf();
  return (await apiClient.request({method,url:`${base}/${path}`,data:body,headers:{[csrf.headerName]:csrf.token}})).data;
 },
};
export function adminError(error:unknown):string {
 const value=error as {status?:number;message?:string};
 if(value?.status===409) return `${value.message || 'This record changed or the action is restricted.'} Refresh the record before trying again.`;
 if(value?.status===403) return 'Access denied or the security token expired. Refresh your session before retrying; the action was not replayed.';
 if(value?.status===429) return 'Too many attempts. Please wait before trying again.';
 if(value?.status===503) return 'The service is temporarily unavailable. Refresh and verify the record before retrying.';
 return value?.message || 'Unable to connect. Check your connection and try again.';
}
/** Colombo has a fixed UTC+05:30 offset; date input upper bound includes the selected day. */
export function statisticsRange(from:string,to:string):{from:string;to:string} {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new Error('Select both dates.');
 for (const value of [from,to]) {
  const date=new Date(value+'T00:00:00Z');
  if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==value) throw new Error('Select valid calendar dates.');
 }
 const start=new Date(`${from}T00:00:00+05:30`), end=new Date(new Date(`${to}T00:00:00+05:30`).getTime()+86400000);
 if(!Number.isFinite(+start)||!Number.isFinite(+end)||end<=start||+end-+start>3660*86400000) throw new Error('Choose an increasing date range of no more than 3660 days.');
 return {from:start.toISOString(),to:end.toISOString()};
}
export function localEventTime(value:string|number|null|undefined):string {
 if(!value) return '';
 const raw=String(value); // JDBC timestamps without a zone represent database UTC.
 const date=new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(raw)?raw:raw.replace(' ','T')+'Z');
 if(!Number.isFinite(+date))return '';
 return new Date(+date+19800000).toISOString().slice(0,16);
}
export const roles:Record<number,string>={1:'User',2:'Coordinator',3:'Administrator',4:'Student',5:'Contributor'};
export const accountStates:Record<number,string>={1:'Active',2:'Suspended',3:'Pending'};
export const reviewStates:Record<number,string>={1:'Pending',2:'Approved',3:'Rejected',4:'Draft'};
export const paymentStates:Record<number,string>={1:'Pending',2:'Successful',3:'Failed',4:'Cancelled',5:'Refunded'};
