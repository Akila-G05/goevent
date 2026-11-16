import { afterEach, expect, it, vi } from 'vitest';
import type { AxiosAdapter } from 'axios';
import { apiClient } from '@/lib/api-client';
import { authApi } from '@/api/auth';
import { userApi } from '@/api/user';

const original = apiClient.defaults.adapter;
afterEach(() => { apiClient.defaults.adapter = original; });

it('fetches fresh tokens for login, Google, registration, logout and profile writes', async () => {
  let token = 0;
  const adapter = vi.fn<AxiosAdapter>().mockImplementation(async config => {
    const data = config.url?.endsWith('/csrf')
      ? { headerName: 'X-CSRF-TOKEN', token: `token-${++token}` } : { status: true };
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  });
  apiClient.defaults.adapter = adapter;
  await authApi.authenticateManual({ email: 'member@example.invalid', password: 'fixture' });
  await authApi.authenticateGoogle({ idToken: 'fixture' });
  await authApi.registerManual({ fname:'Test',lname:'User',email:'member@example.invalid',password:'fixture',confirmPassword:'fixture',roleId:'1' });
  await authApi.logout();
  await userApi.updateProfile({ firstName: 'Test', lastName: 'User' });
  await userApi.uploadProfileImage(new File(['fixture'], 'avatar.png', { type: 'image/png' }));
  const writes = adapter.mock.calls.map(([config]) => config).filter(config => config.method !== 'get');
  expect(writes).toHaveLength(6);
  writes.forEach((config, index) => {
    expect(config.headers.get('X-CSRF-TOKEN')).toBe(`token-${index+1}`);
    expect(config.withCredentials).toBe(true);
  });
  expect(writes[5].data).toBeInstanceOf(FormData);
});

it('fails closed on malformed CSRF responses and does not replay rejected mutations', async () => {
  const adapter = vi.fn<AxiosAdapter>().mockImplementation(async config => ({
    data: {}, status: 200, statusText: 'OK', headers: {}, config,
  }));
  apiClient.defaults.adapter = adapter;
  await expect(authApi.logout()).rejects.toThrow('security token');
  expect(adapter).toHaveBeenCalledTimes(1);
  adapter.mockClear().mockImplementation(async config => {
    if (config.method !== 'get') throw { response: { status: 403, data: { message:'Denied' } } };
    return { data:{headerName:'X-CSRF-TOKEN',token:'fresh'},status:200,statusText:'OK',headers:{},config };
  });
  await expect(authApi.logout()).rejects.toMatchObject({status:403});
  expect(adapter).toHaveBeenCalledTimes(2);
});
