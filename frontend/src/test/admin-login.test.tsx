import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from '@/app/login/page';
import { authApi } from '@/api';
import { adminApi } from '@/api/admin';
const redirect=vi.hoisted(()=>vi.fn());
vi.mock('next/navigation',()=>({useRouter:()=>({replace:redirect,push:vi.fn()})}));
vi.mock('next/image',()=>({default:()=>null}));
vi.mock('@/components/auth/google-auth-button',()=>({GoogleAuthButton:()=>null}));
vi.mock('@/lib/loading-store',()=>({loading:{open:vi.fn(),close:vi.fn()}}));
afterEach(()=>{cleanup();vi.restoreAllMocks();redirect.mockReset();});
async function submit(){render(<QueryClientProvider client={new QueryClient()}><Login/></QueryClientProvider>);const email=document.querySelector<HTMLInputElement>('input[type=email]')!,password=document.querySelector<HTMLInputElement>('input[name=password]')!;fireEvent.change(email,{target:{value:'admin@example.invalid'}});fireEvent.change(password,{target:{value:'test-password-long'}});fireEvent.click(screen.getByRole('button',{name:'Sign In'}));}
it('elevates password admins and navigates only after dedicated verification',async()=>{vi.spyOn(authApi,'authenticateManual').mockResolvedValue({status:true,roleId:'ADMIN',userId:1});const login=vi.spyOn(adminApi,'login').mockResolvedValue({status:true,userId:1,role:'ADMIN'});await submit();await waitFor(()=>expect(redirect).toHaveBeenCalledWith('/admin'));expect(login).toHaveBeenCalledWith('admin@example.invalid','test-password-long');});
it('does not claim admin success when elevation fails',async()=>{vi.spyOn(authApi,'authenticateManual').mockResolvedValue({status:true,roleId:'ADMIN',userId:1});vi.spyOn(adminApi,'login').mockRejectedValue({status:503,message:'Unavailable'});await submit();await waitFor(()=>expect(screen.getByRole('button',{name:'Sign In'})).not.toBeDisabled());expect(redirect).not.toHaveBeenCalled();});
it('keeps ordinary login out of the admin authentication flow',async()=>{vi.spyOn(authApi,'authenticateManual').mockResolvedValue({status:true,roleId:'USER',userId:2});vi.spyOn(authApi,'getSession').mockResolvedValue({status:true,authenticated:true,userId:2});const login=vi.spyOn(adminApi,'login');await submit();expect(await screen.findByText('Visit Site')).toBeInTheDocument();expect(login).not.toHaveBeenCalled();expect(redirect).not.toHaveBeenCalled();});
