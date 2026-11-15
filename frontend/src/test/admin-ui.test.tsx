import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { adminApi, adminError, localEventTime, statisticsRange } from '@/api/admin';
import { apiClient } from '@/lib/api-client';
import { AdminDashboard } from '@/components/admin/dashboard';
import { AccountForm, EventForm } from '@/components/admin/forms';
import { Dialog } from '@/components/ui/dialog';
import { contentApi } from '@/api/content';
const routing=vi.hoisted(()=>({view:'accounts',replace:vi.fn(),push:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>routing,useSearchParams:()=>new URLSearchParams({view:routing.view})}));
vi.mock('next/link',()=>({default:({children,href,...props}:{children:React.ReactNode;href:string})=><a href={href} {...props}>{children}</a>}));
const record={id:2,fname:'Test',lname:'User',email:'test@example.invalid',role_id:1,user_status_id:1,registered_date:'2026-11-01T00:00:00Z'};
function wrap(element:React.ReactNode){const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});return {...render(<QueryClientProvider client={client}>{element}</QueryClientProvider>),client};}
beforeEach(()=>{
 routing.view='accounts';routing.replace.mockReset();
 vi.spyOn(adminApi,'session').mockResolvedValue({status:true,userId:1,role:'ADMIN',name:'Fixture Admin'});
 vi.spyOn(adminApi,'list').mockResolvedValue([record]);
 vi.spyOn(adminApi,'detail').mockResolvedValue(record);
 vi.spyOn(adminApi,'write').mockResolvedValue({status:true});
 vi.spyOn(contentApi,'getOrganizations').mockResolvedValue({status:true,message:'',data:[{id:1,name:'Test organization',org_type_id:1,type:'Test'}]});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe('date and error contracts',()=>{
 it('uses Colombo calendar bounds and inclusive through date',()=>expect(statisticsRange('2026-11-01','2026-11-30')).toEqual({from:'2026-10-31T18:30:00.000Z',to:'2026-11-30T18:30:00.000Z'}));
 it('rejects missing/reversed/overlong ranges',()=>{for(const range of [['',''],['2026-12-01','2026-11-01'],['2000-01-01','2026-11-01']])expect(()=>statisticsRange(...range as [string,string])).toThrow();});
 it('converts UTC event instants to Colombo editor values',()=>expect(localEventTime('2026-11-01T09:00:00Z')).toBe('2026-11-01T14:30'));
 it('does not invent unknown legacy dates',()=>expect(localEventTime(null)).toBe(''));
 it('explains conflicts without retrying writes',()=>expect(adminError({status:409,message:'Linked records exist'})).toContain('Refresh the record'));
});
it('renders live accounts with safe field labels',async()=>{wrap(<AdminDashboard/>);expect(await screen.findByText('Test User')).toBeInTheDocument();expect(screen.getByText('User',{selector:'td'})).toBeInTheDocument();});
it('does not fetch private data before authentication',async()=>{vi.mocked(adminApi.session).mockRejectedValue({status:401});wrap(<AdminDashboard/>);await waitFor(()=>expect(routing.replace).toHaveBeenCalledWith('/login'));expect(adminApi.list).not.toHaveBeenCalled();});
it('keeps a network failure distinct from an expired session',async()=>{vi.mocked(adminApi.session).mockRejectedValue({message:'Offline'});wrap(<AdminDashboard/>);expect(await screen.findByText('Cannot verify your session')).toBeInTheDocument();expect(routing.replace).not.toHaveBeenCalled();expect(adminApi.list).not.toHaveBeenCalled();});
it('requires a reason and confirms account disable once',async()=>{wrap(<AdminDashboard/>);fireEvent.click(await screen.findByRole('button',{name:'Disable'}));const dialog=screen.getByRole('dialog');expect(within(dialog).getByRole('button',{name:'Disable account'})).toBeDisabled();fireEvent.change(within(dialog).getByLabelText('Reason'),{target:{value:'Verified policy breach'}});fireEvent.click(within(dialog).getByRole('button',{name:'Disable account'}));await waitFor(()=>expect(adminApi.write).toHaveBeenCalledWith('POST','accounts/2/disable',{reason:'Verified policy breach'}));});
it('shows linked deletion conflicts and does not replay',async()=>{vi.mocked(adminApi.write).mockRejectedValue({status:409,message:'Linked records exist'});wrap(<AdminDashboard/>);fireEvent.click(await screen.findByRole('button',{name:'Delete'}));fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Test deletion'}});fireEvent.click(screen.getByRole('button',{name:'Delete account'}));expect(await screen.findByText(/Linked records exist/)).toBeInTheDocument();expect(adminApi.write).toHaveBeenCalledTimes(1);});
it('failed logout does not claim success or navigate away',async()=>{vi.mocked(adminApi.write).mockRejectedValue({message:'Offline'});wrap(<AdminDashboard/>);await screen.findByText('Test User');fireEvent.click(screen.getByRole('button',{name:/^Account:/}));fireEvent.click(screen.getByRole('menuitem',{name:'Sign out'}));await screen.findByText(/Offline/);expect(routing.replace).not.toHaveBeenCalled();});
it('event decisions fetch the current revision first',async()=>{routing.view='events';const event={id:3,name:'Test event',event_status_id:1,revision:4,published_by:2,disabled_at:null};vi.mocked(adminApi.list).mockResolvedValue([event]);vi.mocked(adminApi.detail).mockResolvedValue({...event,revision:5});wrap(<AdminDashboard/>);fireEvent.click(await screen.findByRole('button',{name:'Approve'}));await screen.findByRole('dialog');fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Reviewed'}});fireEvent.click(screen.getByRole('button',{name:'Approve event'}));await waitFor(()=>expect(adminApi.write).toHaveBeenCalledWith('POST','events/3/decision',{approve:true,revision:5,reason:'Reviewed'}));});
it('queues a contact reply and labels delivery accurately',async()=>{routing.view='contacts';vi.mocked(adminApi.list).mockResolvedValue([{id:8,email:'test@example.invalid',subject:'Help',replied_at:null}]);wrap(<AdminDashboard/>);fireEvent.click(await screen.findByRole('button',{name:'Reply'}));fireEvent.change(screen.getByLabelText('Reply message'),{target:{value:'We are reviewing your request.'}});fireEvent.click(screen.getByRole('button',{name:'Send reply'}));expect(await screen.findByText(/Reply queued. Provider acceptance/)).toBeInTheDocument();});
it('failed email retry requires an audited reason',async()=>{routing.view='emails';vi.mocked(adminApi.list).mockResolvedValue([{id:9,status:'FAILED',attempts:5}]);wrap(<AdminDashboard/>);fireEvent.click(await screen.findByRole('button',{name:'Retry'}));fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Provider restored'}});fireEvent.click(screen.getByRole('button',{name:'Retry notification'}));await waitFor(()=>expect(adminApi.write).toHaveBeenCalledWith('POST','emails/9/retry',{reason:'Provider restored'}));});
it('account form excludes passwords from editing',async()=>{const save=vi.fn();wrap(<AccountForm record={record} busy={false} onSave={save} onCancel={()=>{}}/>);expect(screen.queryByLabelText('Initial password')).not.toBeInTheDocument();fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Profile corrected'}});fireEvent.click(screen.getByRole('button',{name:'Save changes'}));await waitFor(()=>expect(save).toHaveBeenCalled());expect(save.mock.calls[0][0]).not.toHaveProperty('password');});
it('validates coordinator organization before account creation',async()=>{const save=vi.fn();wrap(<AccountForm busy={false} onSave={save} onCancel={()=>{}}/>);fireEvent.change(screen.getByLabelText('First name'),{target:{value:'Test'}});fireEvent.change(screen.getByLabelText('Last name'),{target:{value:'User'}});fireEvent.change(screen.getByLabelText('Email'),{target:{value:'new@example.invalid'}});fireEvent.change(screen.getByLabelText(/Initial password/),{target:{value:'test-password-long'}});fireEvent.change(screen.getByLabelText('Role'),{target:{value:'2'}});fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Verified'}});fireEvent.click(screen.getByRole('button',{name:'Create account'}));expect(await screen.findByText('Select an organization and enter a position.')).toBeInTheDocument();expect(save).not.toHaveBeenCalled();});
it('rejects an event ending before its start',async()=>{const save=vi.fn();wrap(<EventForm record={{id:3,name:'Event',revision:0,starts_at:'2026-11-01T10:00:00Z',ends_at:'2026-11-01T09:00:00Z'}} busy={false} onSave={save} onCancel={()=>{}}/>);fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Correct schedule'}});fireEvent.click(screen.getByRole('button',{name:'Save event'}));expect(await screen.findByText('End must be after start.')).toBeInTheDocument();expect(save).not.toHaveBeenCalled();});
it('contains focus and restores it when a dialog closes',()=>{const close=vi.fn();wrap(<Dialog open onClose={close} title="Confirm"><button>First</button><button>Last</button></Dialog>);const last=screen.getByText('Last');last.focus();fireEvent.keyDown(document,{key:'Tab'});expect(screen.getByRole('button',{name:'Close dialog'})).toHaveFocus();fireEvent.keyDown(document,{key:'Escape'});expect(close).toHaveBeenCalled();});
it('admin API obtains a token on every write without automatic retries',async()=>{const get=vi.spyOn(apiClient,'get').mockResolvedValue({data:{headerName:'X-CSRF-TOKEN',token:'fresh'}});const request=vi.spyOn(apiClient,'request').mockRejectedValue({status:403});vi.mocked(adminApi.write).mockRestore();await expect(adminApi.write('POST','accounts/2/disable',{reason:'Test'})).rejects.toEqual({status:403});expect(get).toHaveBeenCalledWith('/goevent/api/admin/auth/csrf');expect(request).toHaveBeenCalledTimes(1);expect(request).toHaveBeenCalledWith(expect.objectContaining({headers:{'X-CSRF-TOKEN':'fresh'}}));});
it('passes role filters and pagination to the backend',async()=>{vi.mocked(adminApi.list).mockResolvedValue(Array.from({length:25},(_,i)=>({...record,id:i+2,email:`user${i}@example.invalid` })));wrap(<AdminDashboard/>);fireEvent.click(await screen.findByRole('button',{name:'Next'}));await waitFor(()=>expect(adminApi.list).toHaveBeenCalledWith('accounts',expect.objectContaining({page:1})));fireEvent.change(screen.getByLabelText('Role'),{target:{value:'2'}});await waitFor(()=>expect(adminApi.list).toHaveBeenCalledWith('accounts',expect.objectContaining({page:0,role:'2'})));});
it('clears access when a subsequent protected query returns 401',async()=>{vi.mocked(adminApi.list).mockRejectedValue({status:401});wrap(<AdminDashboard/>);await waitFor(()=>expect(routing.replace).toHaveBeenCalledWith('/login'));});
it('blocks invalid calendar dates rather than normalizing them',()=>expect(()=>statisticsRange('2026-02-31','2026-03-05')).toThrow('valid calendar dates'));
it('switches to the same account ordinary session and clears private admin cache',async()=>{
 const {authApi}=await import('@/api');
 vi.spyOn(authApi,'getSession').mockResolvedValue({status:true,authenticated:true,userId:1,roleId:'ADMIN',adminUserMode:true,email:'admin@example.invalid'});
 wrap(<AdminDashboard/>);fireEvent.click(await screen.findByRole('button',{name:/^Account:/}));fireEvent.click(screen.getByRole('menuitem',{name:'Switch to user'}));
 await waitFor(()=>expect(routing.replace).toHaveBeenCalledWith('/profile'));
 expect(adminApi.write).toHaveBeenCalledWith('POST','auth/switch-to-user',{});
});
it('does not navigate when switching to user fails',async()=>{
 vi.mocked(adminApi.write).mockRejectedValue({status:503,message:'Unavailable'});
 wrap(<AdminDashboard/>);fireEvent.click(await screen.findByRole('button',{name:/^Account:/}));fireEvent.click(screen.getByRole('menuitem',{name:'Switch to user'}));
 await screen.findByText(/service is temporarily unavailable/);
 expect(routing.replace).not.toHaveBeenCalled();
});

it('resolves the signed-in account name when an older session endpoint omits display fields',async()=>{
 vi.mocked(adminApi.session).mockResolvedValue({status:true,userId:1,role:'ADMIN'});
 vi.mocked(adminApi.detail).mockResolvedValue({id:1,fname:'Zen',lname:'Goku',email:'fixture@example.invalid'});
 wrap(<AdminDashboard/>);
 expect(await screen.findByRole('button',{name:'Account: Zen Goku'})).toBeInTheDocument();
 expect(adminApi.detail).toHaveBeenCalledWith('accounts',1);
 expect(screen.queryByText('Account #1')).not.toBeInTheDocument();
});
