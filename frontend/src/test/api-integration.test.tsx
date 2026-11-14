import React from 'react';
import type { AxiosAdapter } from 'axios';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiClient } from '@/lib/api-client';
import { GoogleAuthButton } from '@/components/auth/google-auth-button';
import nextConfig from '../../next.config.mjs';

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }: { onSuccess: (value: { credential: string }) => void }) => (
    <button onClick={() => onSuccess({ credential: 'test-credential' })}>Google test login</button>
  ),
}));
const originalAdapter = apiClient.defaults.adapter;
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  vi.unstubAllEnvs();
});

it('posts login credentials to the same API prefix with cookies', async () => {
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test.apps.googleusercontent.com');
  const adapter = vi.fn<AxiosAdapter>().mockImplementation(async config => ({
    data: { status: false, message: 'Rejected' },
    status: 200, statusText: 'OK', headers: {}, config,
  }));
  apiClient.defaults.adapter = adapter;
  render(<GoogleAuthButton />);
  fireEvent.click(screen.getByText('Google test login'));
  await waitFor(() => expect(adapter).toHaveBeenCalledWith(expect.objectContaining({
    baseURL: apiClient.defaults.baseURL, url: '/goevent/api/auth/google', method: 'post',
    withCredentials: true, data: JSON.stringify({ idToken: 'test-credential' }),
  })));
  expect(apiClient.getUri(adapter.mock.calls[0][0])).toBe('/goevent/api/auth/google');
});

it('maps current and legacy browser prefixes to the real backend prefix', async () => {
  if (!nextConfig.rewrites) throw new Error("Missing rewrite configuration");
  const rewrites = await nextConfig.rewrites();
  if (!Array.isArray(rewrites)) throw new Error("Expected explicit rewrite list");
  expect(rewrites.map(route => route.source)).toEqual(['/goevent/api/:path*', '/api/v1/:path*']);
  expect(rewrites.every(route => route.destination.endsWith('/goevent/api/:path*'))).toBe(true);
});
