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
it.each(['USER','ORGANIZER','ADMIN'])('does not expose removed admin controls to %s',async(role)=>{
 renderProfile(role);await screen.findByRole('heading',{name:/Fixture/});
 expect(screen.queryByRole('link',{name:'Admin dashboard'})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Back to admin'})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'ADMIN'})).not.toBeInTheDocument();
});
