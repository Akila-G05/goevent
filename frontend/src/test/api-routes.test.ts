import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it.each([
  ['', ''],
  ['/goevent/api', ''],
  ['/goevent/api/', ''],
  ['/api/v1', ''],
  ['https://api.example.com', 'https://api.example.com'],
  ['https://api.example.com/goevent/api/', 'https://api.example.com'],
  ['https://api.example.com/api/v1', 'https://api.example.com'],
])('resolves API base %j without duplicating route prefixes', async (configured, origin) => {
  vi.resetModules();
  vi.stubEnv('API_URL', configured);
  vi.stubEnv('NEXT_PUBLIC_API_URL', '');
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '');
  const { apiClient } = await import('@/lib/api-client');
  const { API_ROUTES } = await import('@/api/routes');
  const { resolveProfileImageUrl } = await import('@/api/user');

  for (const route of Object.values(API_ROUTES.AUTH)) {
    expect(apiClient.getUri({ url: route })).toBe(`${origin}${route}`);
  }
  expect(apiClient.getUri({ url: API_ROUTES.CONTENT.INITIAL_DATA }))
    .toBe(`${origin}/goevent/api/content/initial-data`);
  expect(resolveProfileImageUrl('/goevent/api/images/profile/1/avatar.png'))
    .toBe(`${origin}/goevent/api/images/profile/1/avatar.png`);
});
