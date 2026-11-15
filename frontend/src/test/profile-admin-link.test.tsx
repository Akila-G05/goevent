import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Profile from '@/app/profile/page';
import { userApi } from '@/api';
import { adminApi } from '@/api/admin';
import { fireEvent, waitFor } from '@testing-library/react';
import { useSessionStore } from '@/lib/session-store';
const route=vi.hoisted(()=>({replace:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>route}));
vi.mock('@/hooks/use-minimum-loading',()=>({useMinimumLoading:(value:boolean)=>value}));
vi.mock('@/hooks/use-logout',()=>({useLogout:()=>({logout:vi.fn(),isLoggingOut:false})}));
afterEach(()=>{cleanup();vi.restoreAllMocks();useSessionStore.getState().clear();});
function renderProfile(role:string){useSessionStore.getState().setAuthenticated({userId:7,roleId:role});vi.spyOn(userApi,'getProfile').mockResolvedValue({status:true,name:'Fixture',role,email:'fixture@example.invalid'});render(<QueryClientProvider client={new QueryClient()}><Profile/></QueryClientProvider>);}
it('provides actual admins a real dashboard link instead of a demo toggle',async()=>{renderProfile('ADMIN');expect(await screen.findByRole('link',{name:'Admin dashboard'})).toHaveAttribute('href','/admin');expect(screen.queryByRole('button',{name:'ADMIN'})).not.toBeInTheDocument();});
it('does not offer an Admin role toggle to ordinary users',async()=>{renderProfile('USER');await screen.findByRole('heading',{name:/Fixture/});expect(screen.queryByRole('link',{name:'Admin dashboard'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'ADMIN'})).not.toBeInTheDocument();});

it('provides a working return control only for the own-account user-mode session',async()=>{
 useSessionStore.getState().setAuthenticated({userId:7,roleId:'ADMIN',adminUserMode:true});
 vi.spyOn(userApi,'getProfile').mockResolvedValue({status:true,name:'Fixture',role:'ADMIN',email:'fixture@example.invalid'});
 const write=vi.spyOn(adminApi,'write').mockResolvedValue({status:true,userId:7,role:'ADMIN',adminUserMode:false});
 vi.spyOn(adminApi,'session').mockResolvedValue({status:true,userId:7,role:'ADMIN'});
 render(<QueryClientProvider client={new QueryClient()}><Profile/></QueryClientProvider>);
 fireEvent.click(await screen.findByRole('button',{name:'Back to admin'}));
 await waitFor(()=>expect(route.replace).toHaveBeenCalledWith('/admin'));
 expect(write).toHaveBeenCalledWith('POST','auth/switch-to-admin',{});
});
