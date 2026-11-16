import React from 'react';
import type { AxiosAdapter } from 'axios';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiClient } from '@/lib/api-client';
import { GoogleAuthButton } from '@/components/auth/google-auth-button';
import nextConfig from '../../next.config.mjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const navigation=vi.hoisted(()=>({replace:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>navigation}));

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }: { onSuccess: (value: { credential: string }) => void }) => (
    <button onClick={() => onSuccess({ credential: 'test-credential' })}>Google test login</button>
  ),
}));
const originalAdapter = apiClient.defaults.adapter;
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  vi.unstubAllEnvs();
  navigation.replace.mockReset();
});

it('posts login credentials to the same API prefix with cookies', async () => {
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test.apps.googleusercontent.com');
  const adapter = vi.fn<AxiosAdapter>().mockImplementation(async config => ({
    data: config.url?.endsWith('/csrf') ? {headerName:'X-CSRF-TOKEN',token:'fresh'} : { status: false, message: 'Rejected' },
    status: 200, statusText: 'OK', headers: {}, config,
  }));
  apiClient.defaults.adapter = adapter;
  render(<QueryClientProvider client={new QueryClient()}><GoogleAuthButton /></QueryClientProvider>);
  fireEvent.click(screen.getByText('Google test login'));
  await waitFor(() => expect(adapter).toHaveBeenCalledWith(expect.objectContaining({
    baseURL: apiClient.defaults.baseURL, url: '/goevent/api/auth/google', method: 'post',
    withCredentials: true, data: JSON.stringify({ idToken: 'test-credential' }),
  })));
  expect(apiClient.getUri(adapter.mock.calls.find(([config])=>config.method==='post')![0])).toBe('/goevent/api/auth/google');
});

it('navigates a Google admin only after verifying the dedicated server session', async()=>{
 vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID','test.apps.googleusercontent.com');
 const adapter=vi.fn<AxiosAdapter>().mockImplementation(async config=>({data:config.url?.endsWith('/csrf')?{headerName:'X-CSRF-TOKEN',token:'fresh'}:{status:true,action:'LOGIN',roleId:'ADMIN',role:'ADMIN',userId:7},status:200,statusText:'OK',headers:{},config}));
 apiClient.defaults.adapter=adapter;
 render(<QueryClientProvider client={new QueryClient()}><GoogleAuthButton/></QueryClientProvider>);
 fireEvent.click(screen.getByText('Google test login'));
 await waitFor(()=>expect(navigation.replace).toHaveBeenCalledWith('/admin'));
 expect(adapter).toHaveBeenCalledWith(expect.objectContaining({url:'/goevent/api/admin/auth/session'}));
 expect(adapter).toHaveBeenCalledWith(expect.objectContaining({url:'/goevent/api/admin/auth/csrf'}));
});

it('rejects a claimed Google admin when the dedicated server session is denied',async()=>{
 vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID','test.apps.googleusercontent.com');
 const adapter=vi.fn<AxiosAdapter>().mockImplementation(async config=>{
  if(config.url?.endsWith('/session'))throw {response:{status:401,data:{message:'Unauthorized'}}};
  return {data:config.url?.endsWith('/csrf')?{headerName:'X-CSRF-TOKEN',token:'fresh'}:{status:true,action:'LOGIN',roleId:'ADMIN'},status:200,statusText:'OK',headers:{},config};
 });apiClient.defaults.adapter=adapter;
 render(<QueryClientProvider client={new QueryClient()}><GoogleAuthButton/></QueryClientProvider>);
 fireEvent.click(screen.getByText('Google test login'));
 await waitFor(()=>expect(adapter).toHaveBeenCalledTimes(3));
 expect(navigation.replace).not.toHaveBeenCalled();
});

it('maps current and legacy browser prefixes to the real backend prefix', async () => {
  if (!nextConfig.rewrites) throw new Error("Missing rewrite configuration");
  const rewrites = await nextConfig.rewrites();
  if (!Array.isArray(rewrites)) throw new Error("Expected explicit rewrite list");
  expect(rewrites.map(route => route.source)).toEqual(['/goevent/api/:path*', '/api/v1/:path*']);
  expect(rewrites.every(route => route.destination.endsWith('/goevent/api/:path*'))).toBe(true);
});
